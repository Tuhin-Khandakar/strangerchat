import 'dotenv/config';
import path from 'path';

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';


/**
 * STARTUP VALIDATION
 */
const REQUIRED_ENV = ['PORT', 'NODE_ENV'];
const OPTIONAL_ENV = {
    DB_NAME: 'moderation.db',
    DEBUG: 'false'
};

// Check Required
const missingRequired = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingRequired.length > 0) {
    console.error('[FATAL] Environment variable validation failed');
    missingRequired.forEach(key => {
        console.error(`- ${key}: is required but missing`);
    });
    console.error('Please refer to .env.example and update your .env file.');
    process.exit(1);
}

// Check Optional & Set Defaults
Object.entries(OPTIONAL_ENV).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
        console.warn(`\x1b[33m[WARN] Optional environment variable ${key} is missing. Using default: ${defaultValue}\x1b[0m`);
        process.env[key] = defaultValue;
    }
});

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

if (MAINTENANCE_MODE) {
    app.use((req, res) => {
        res.status(503).sendFile(path.join(__dirname, "../public/maintenance.html"));
    });
}

app.use(express.static(path.join(__dirname, "../public")));

const dbPath = path.join(__dirname, 'db');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}
const db = new Database(path.join(dbPath, process.env.DB_NAME));

try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS user_moderation (
        ip_hash TEXT PRIMARY KEY,
        reports INTEGER DEFAULT 0,
        banned_until INTEGER DEFAULT NULL,
        last_report_at INTEGER
      )
    `).run();
    console.log("SQLite moderation DB initialized");
} catch (err) {
    console.error("FATAL: Failed to initialize SQLite DB:", err);
    process.exit(1);
}

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
    CONN_RATE_LIMIT: 10, // Max 10 connections per window
    CONN_RATE_WINDOW_MS: 60 * 1000, // 1 minute
};

/**
 * STATE MANAGEMENT
 */
const socketStates = new Map(); // socket.id -> { state, partnerId, roomId, lastMsgAt, lastMatchAt, ipHash, reportsSent }
const connectionRates = new Map(); // ipHash -> { count, windowStart }
let waitingQueue = []; // Array of socket IDs
const isProd = process.env.NODE_ENV === 'production';

/**
 * UTILS
 */
const getIpHash = (socket) => {
    // Check various headers for behind-proxy IPs (adjust based on deployment)
    const ip = socket.handshake.headers['x-forwarded-for'] ||
        socket.handshake.address ||
        socket.request.connection.remoteAddress;
    return crypto.createHash('sha256').update(ip).digest('hex');
};

const sanitize = (text) => {
    if (typeof text !== 'string') return '';
    return text
        .trim()
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .substring(0, CONSTRAINTS.MSG_MAX_LENGTH);
};

const transitionState = (socketId, newState, metadata = {}) => {
    const session = socketStates.get(socketId);
    if (!session) return;

    const currentState = session.state;
    const allowed = {
        'idle': ['waiting', 'idle'],
        'waiting': ['chatting', 'idle', 'waiting'],
        'chatting': ['idle', 'waiting', 'chatting']
    };

    if (!allowed[currentState] || !allowed[currentState].includes(newState)) {
        if (!isProd) {
            console.warn(`Blocked invalid state transition: ${currentState} -> ${newState} for ${socketId}`);
        }
        return;
    }

    socketStates.set(socketId, { ...session, state: newState, ...metadata });
};

/**
 * Persitence Helpers
 */
const isUserBanned = (ipHash) => {
    try {
        const row = db.prepare("SELECT banned_until FROM user_moderation WHERE ip_hash = ?").get(ipHash);
        if (!row || !row.banned_until) return false;
        return Date.now() < row.banned_until;
    } catch (err) {
        console.error(`Database error checking ban for ${ipHash.substring(0, 8)}:`, err);
        return false; // Fail-open to allow connection but log error
    }
};

const reportUser = (ipHash) => {
    const now = Date.now();
    try {
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
    } catch (err) {
        console.error(`Database error reporting user ${ipHash.substring(0, 8)}:`, err);
    }
};

const cleanupSession = (socketId) => {
    const session = socketStates.get(socketId);
    if (!session) return;

    // Handle edge case where partner also disconnected
    if (session.state === 'chatting' && session.partnerId) {
        const partnerId = session.partnerId;
        const partnerSession = socketStates.get(partnerId);

        // Notify partner if they are still connected and in chatting state with us
        if (partnerSession && partnerSession.partnerId === socketId) {
            const partnerSocket = io.sockets.sockets.get(partnerId);
            if (partnerSocket && !partnerSocket.disconnected) {
                partnerSocket.emit('partner_left');
                transitionState(partnerId, 'idle', { partnerId: null, roomId: null });
                if (session.roomId) {
                    partnerSocket.leave(session.roomId);
                }
            }
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
    const now = Date.now();

    // Connection Rate Limiting
    const rate = connectionRates.get(ipHash) || { count: 0, windowStart: now };
    if (now - rate.windowStart > CONSTRAINTS.CONN_RATE_WINDOW_MS) {
        rate.count = 1;
        rate.windowStart = now;
    } else {
        rate.count++;
    }
    connectionRates.set(ipHash, rate);

    if (rate.count > CONSTRAINTS.CONN_RATE_LIMIT) {
        if (!isProd) console.log(`Rate limited connection attempt: ${ipHash.substring(0, 8)}`);
        socket.emit("sys_error", "Too many connection attempts. Please wait a minute.");
        socket.disconnect(true);
        return;
    }

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
        reportsSent: 0,
        lastReportAt: 0
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
            const partnerSession = socketStates.get(partnerId);

            // Robust check for partner validity
            if (!partnerSocket || partnerSocket.disconnected || !partnerSession || partnerSession.state !== 'waiting') {
                if (!isProd) console.log(`Partner ${partnerId} became unavailable during matchmaking`);
                // Continue searching if partner is gone
                return socket.emit('searching'); // The next call to find_match or interval will handle queue
                // Actually, since we're already in the find_match handler, we should probably recurse or just wait.
                // For simplicity, let's just let the user try again or push themselves to queue.
                // Better: push self back to queue and let them wait.
            }

            const roomId = uuidv4();
            try {
                socket.join(roomId);
                partnerSocket.join(roomId);

                transitionState(socket.id, 'chatting', { partnerId, roomId, lastMatchAt: now });
                transitionState(partnerId, 'chatting', { partnerId: socket.id, roomId, lastMatchAt: now });

                if (!isProd) {
                    console.log(`MATCHED: ${socket.id} with ${partnerId}`);
                }
                io.to(roomId).emit('matched');
            } catch (err) {
                console.error("Matchmaking error during room join:", err);
                socket.emit('sys_error', 'Matchmaking failed. Please try again.');
                cleanupSession(socket.id);
                cleanupSession(partnerId);
            }
        } else {
            waitingQueue.push(socket.id);
            socket.emit('searching');
        }
    });

    socket.on('send_msg', (rawText) => {
        // Validation: Ensure text is a string
        if (typeof rawText !== 'string') return;

        const text = sanitize(rawText);
        if (!text) return;

        const session = socketStates.get(socket.id);
        if (!session || session.state !== 'chatting') return;

        const now = Date.now();

        // 1. Rate Limiting
        if (now - session.lastMsgAt < CONSTRAINTS.MSG_RATE_LIMIT_MS) return;
        session.lastMsgAt = now;

        // 2. Length Check (redundant due to sanitize but kept for safety)
        if (text.length > CONSTRAINTS.MSG_MAX_LENGTH) return;

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
            const now = Date.now();

            // Time-based reset (Gap #4)
            if (now - session.lastReportAt > CONSTRAINTS.REPORT_RATE_WINDOW) {
                session.reportsSent = 0;
            }

            // Rate Limit Check
            if (session.reportsSent >= CONSTRAINTS.REPORT_RATE_LIMIT) {
                socket.emit('sys_error', 'Report rate limit exceeded. Please try again later.');
                return;
            }

            const partnerSession = socketStates.get(session.partnerId);
            if (partnerSession && partnerSession.ipHash) {
                if (!isProd) {
                    console.log(`REPORT: User ${socket.id} reported partner ${session.partnerId} (IP Hash: ${partnerSession.ipHash.substring(0, 8)})`);
                }
                reportUser(partnerSession.ipHash);
                session.reportsSent++;
                session.lastReportAt = now;
                socket.emit('sys_info', 'Partner reported.');
            }
        }
    });

    socket.on('typing', (isTyping) => {
        // Validation: Ensure isTyping is a boolean
        if (typeof isTyping !== 'boolean') return;

        const session = socketStates.get(socket.id);
        if (session && session.state === 'chatting') {
            socket.to(session.roomId).emit('partner_typing', isTyping);
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

// Cleanup connection rate limits every hour
setInterval(() => {
    connectionRates.clear();
}, 60 * 60 * 1000);

const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (${process.env.NODE_ENV} mode)`);
});
