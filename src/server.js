import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(path.join(__dirname, "../public")));

const dbPath = path.join(__dirname, 'db');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}
const db = new Database(path.join(dbPath, 'moderation.db'));

// Initialize Schema
db.prepare(`
  CREATE TABLE IF NOT EXISTS user_moderation (
    ip_hash TEXT PRIMARY KEY,
    reports INTEGER DEFAULT 0,
    banned_until INTEGER DEFAULT NULL,
    last_report_at INTEGER
  )
`).run();

console.log("SQLite moderation DB initialized");

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e4 // 10KB - Hardened transport-level limit (Gap #2)
});

/**
 * CONFIGURATION & CONSTRAINTS
 */
const CONSTRAINTS = {
    MSG_MAX_LENGTH: 1000,
    MSG_RATE_LIMIT_MS: 500,
    REQUEUE_COOLDOWN_MS: 2000,
    BANNED_WORDS: ['spamlink.com', 'badword1'], // TODO: Move to DB/External service
    REPORT_THRESHOLD: 5,
    TEMP_BAN_DURATION: 1000 * 60 * 60 * 24, // 24 hours
    REPORT_RATE_LIMIT: 5, // Max reports per session
    REPORT_RATE_WINDOW: 60 * 60 * 1000, // 1 hour
};

/**
 * STATE MANAGEMENT
 */
const socketStates = new Map(); // socket.id -> { state, partnerId, roomId, lastMsgAt, lastMatchAt, ipHash, reportsSent }
let waitingQueue = []; // Array of socket IDs
const isProd = process.env.NODE_ENV === 'production';

/**
 * UTILS
 */
const getIpHash = (socket) => {
    const ip = socket.handshake.address || socket.request.connection.remoteAddress;
    return crypto.createHash('sha256').update(ip).digest('hex');
};

const transitionState = (socketId, newState, metadata = {}) => {
    const current = socketStates.get(socketId) || {};
    socketStates.set(socketId, { ...current, state: newState, ...metadata });
};

/**
 * Persitence Helpers
 */
const isUserBanned = (ipHash) => {
    const row = db.prepare("SELECT banned_until FROM user_moderation WHERE ip_hash = ?").get(ipHash);
    if (!row || !row.banned_until) return false;
    return Date.now() < row.banned_until;
};

const reportUser = (ipHash) => {
    const now = Date.now();
    const existing = db.prepare("SELECT reports FROM user_moderation WHERE ip_hash = ?").get(ipHash);

    if (existing) {
        const newReports = existing.reports + 1;
        let bannedUntil = null;
        if (newReports >= CONSTRAINTS.REPORT_THRESHOLD) {
            bannedUntil = now + CONSTRAINTS.TEMP_BAN_DURATION;
        }
        db.prepare(`
            UPDATE user_moderation 
            SET reports = ?, banned_until = ?, last_report_at = ? 
            WHERE ip_hash = ?
        `).run(newReports, bannedUntil, now, ipHash);
    } else {
        db.prepare(`
            INSERT INTO user_moderation (ip_hash, reports, last_report_at) 
            VALUES (?, 1, ?)
        `).run(ipHash, now);
    }
};

const cleanupSession = (socketId) => {
    const session = socketStates.get(socketId);
    if (!session) return;

    if (session.state === 'chatting' && session.partnerId) {
        const partnerSocket = io.sockets.sockets.get(session.partnerId);
        if (partnerSocket) {
            partnerSocket.emit('partner_left');
            transitionState(partnerSocket.id, 'idle', { partnerId: null, roomId: null });
            partnerSocket.leave(session.roomId);
        }
    }

    // Remove from queue
    waitingQueue = waitingQueue.filter(id => id !== socketId);
};

/**
 * SOCKET LOGIC
 */
io.on('connection', (socket) => {
    const ipHash = getIpHash(socket);

    // Step 4: Ban Check on Connection
    if (isUserBanned(ipHash)) {
        console.log(`Banned connection attempt: ${ipHash.substring(0, 8)}`);
        socket.emit("banned", { reason: "You are temporarily banned due to multiple reports." });
        socket.emit("sys_error", "You are temporarily banned due to multiple reports.");
        socket.disconnect(true);
        return;
    }

    if (!isProd) {
        console.log(`Connection: ${socket.id} (Hash: ${ipHash.substring(0, 8)})`);
    }

    socketStates.set(socket.id, {
        state: 'idle',
        partnerId: null,
        roomId: null,
        lastMsgAt: 0,
        lastMatchAt: 0,
        ipHash,
        reportsSent: 0
    });

    // Send initial online count
    socket.emit('online_count', socketStates.size);

    socket.on('find_match', () => {
        const session = socketStates.get(socket.id);
        if (!session) return;

        // Harden cooldown (Gap #3)
        const now = Date.now();
        if (now - session.lastMatchAt < CONSTRAINTS.REQUEUE_COOLDOWN_MS) {
            return;
        }

        // Step 6: Enforce Ban During Matchmaking
        if (isUserBanned(session.ipHash)) {
            socket.emit("banned", { reason: "Your ban is still active." });
            socket.emit("sys_error", "Your ban is still active.");
            socket.disconnect(true);
            return;
        }

        // Explicit cleanup before requeue (Gap #1)
        cleanupSession(socket.id);
        transitionState(socket.id, 'waiting');

        // Matchmaking
        if (waitingQueue.length > 0) {
            const partnerId = waitingQueue.shift();
            const partnerSocket = io.sockets.sockets.get(partnerId);

            if (!partnerSocket || partnerSocket.disconnected) {
                // If partner is invalid, try next or re-queue
                transitionState(socket.id, 'waiting');
                waitingQueue.push(socket.id);
                return socket.emit('searching');
            }

            const roomId = uuidv4();
            socket.join(roomId);
            partnerSocket.join(roomId);

            transitionState(socket.id, 'chatting', { partnerId, roomId, lastMatchAt: now });
            transitionState(partnerId, 'chatting', { partnerId: socket.id, roomId, lastMatchAt: now });

            if (!isProd) {
                console.log(`MATCHED: ${socket.id} with ${partnerId}`);
            }
            io.to(roomId).emit('matched');
        } else {
            waitingQueue.push(socket.id);
            socket.emit('searching');
        }
    });

    socket.on('send_msg', (text) => {
        const session = socketStates.get(socket.id);
        if (!session || session.state !== 'chatting') return;

        const now = Date.now();

        // 1. Rate Limiting
        if (now - session.lastMsgAt < CONSTRAINTS.MSG_RATE_LIMIT_MS) return;
        session.lastMsgAt = now;

        // 2. Length Check
        if (!text || text.length > CONSTRAINTS.MSG_MAX_LENGTH) return;

        // 3. Profanity/Spam Filter
        // TODO: Escalation logic - if user hits filter N times, auto-ban ipHash
        const containsBanned = CONSTRAINTS.BANNED_WORDS.some(word =>
            text.toLowerCase().includes(word)
        );

        if (containsBanned) {
            return socket.emit('sys_error', 'Message blocked by filter.');
        }

        socket.to(session.roomId).emit('receive_msg', { text });
    });

    socket.on('report_user', () => {
        const session = socketStates.get(socket.id);
        if (session && session.state === 'chatting' && session.partnerId) {
            // Rate Limit Check
            if (session.reportsSent >= CONSTRAINTS.REPORT_RATE_LIMIT) return;

            const partnerSession = socketStates.get(session.partnerId);
            if (partnerSession && partnerSession.ipHash) {
                if (!isProd) {
                    console.log(`REPORT: User ${socket.id} reported partner ${session.partnerId} (IP Hash: ${partnerSession.ipHash.substring(0, 8)})`);
                }
                reportUser(partnerSession.ipHash);
                session.reportsSent++;
            }
        }
    });

    socket.on('typing', (isTyping) => {
        const session = socketStates.get(socket.id);
        if (session && session.state === 'chatting') {
            socket.to(session.roomId).emit('partner_typing', !!isTyping);
        }
    });

    socket.on('leave_chat', () => {
        const session = socketStates.get(socket.id);
        if (!session) return;

        if (session.roomId) {
            socket.leave(session.roomId);
        }
        cleanupSession(socket.id);
        transitionState(socket.id, 'idle', { partnerId: null, roomId: null });
    });

    socket.on('disconnect', () => {
        cleanupSession(socket.id);
        socketStates.delete(socket.id);
    });
});

// Broadcast online count every 30 seconds
setInterval(() => {
    io.emit('online_count', socketStates.size);
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
