// src/server.ts - StrangerChat 2.0 Backend
import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pg from 'pg';
import { createClient } from 'redis';
import Stripe from 'stripe';
import axios from 'axios';
import Database from 'better-sqlite3';
import cors from 'cors';

// ============================================================================
// 1. INITIALIZATION & CONFIGURATION
// ============================================================================

const app = express();
app.use(cors({ origin: '*' })); // Allow all for dev testing
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000');
const NODE_ENV = process.env.NODE_ENV || 'production';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS for Socket.io
const io = new SocketServer(server, {
  cors: { origin: process.env.FRONTEND_URL || '*' },
  maxHttpBufferSize: 1e5, // 100KB max message size
  pingInterval: 25000,
  pingTimeout: 60000
});

// --- Database & Redis Multi-Mode Logic ---
let pgPool: pg.Pool | null = null;
let sqliteDb: any = null;
let redisClient: any = null;

const initStorage = async () => {
    // 1. Database (PG or SQLite fallback)
    if (process.env.DATABASE_URL) {
        console.log('📦 Using PostgreSQL database');
        pgPool = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
        });
    } else {
        console.log('📁 Using Local SQLite database (development mode)');
        sqliteDb = new Database('local_chat.db');
        sqliteDb.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                ip_hash TEXT UNIQUE,
                is_premium INTEGER DEFAULT 0,
                created_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS user_moderation (
                ip_hash TEXT PRIMARY KEY,
                reports INTEGER DEFAULT 0,
                last_report_at INTEGER,
                banned_until INTEGER
            );
            CREATE TABLE IF NOT EXISTS premium_subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                status TEXT,
                created_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                sender_id TEXT,
                text TEXT,
                moderation_score REAL,
                created_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                reporter_id TEXT,
                reported_user_id TEXT,
                session_id TEXT,
                reason TEXT,
                created_at INTEGER
            );
        `);
    }

    // 2. Redis (Real or In-Memory fallback)
    if (process.env.REDIS_URL) {
        console.log('🚀 Using Redis for state');
        redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
    } else {
        console.log('🧠 Using In-Memory state management');
        // Simple in-memory mock for redis operations if needed
        redisClient = {
            get: async () => null,
            set: async () => 'OK',
            quit: async () => {},
            on: () => {}
        };
    }
};

let stripe: any = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16' as any
    });
}

// ============================================================================
// 2. TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  ipHash: string;
  interests: string[];
  language: string;
  timezone: string;
  isPremium: boolean;
  isVerified: boolean;
}

interface SocketSession {
  state: 'idle' | 'waiting' | 'chatting';
  user: User;
  partnerId: string | null;
  roomId: string | null;
  lastMsgAt: number;
  reportsSent: number;
  matchedAt: number;
  streak: number;
}

// ============================================================================
// 3. CONSTANTS & CONFIGURATION
// ============================================================================

const CONSTRAINTS = {
  MSG_MAX_LENGTH: 500,
  MSG_RATE_LIMIT_MS: 300,
  MATCH_COOLDOWN_MS: 1000,
  MAX_SESSION_DURATION_FREE: 1200000,
  MAX_SESSION_DURATION_PREMIUM: 3600000,
  REPORT_THRESHOLD: 5,
  TEMP_BAN_DURATION: 86400000,
  PERSPECTIVE_API_THRESHOLD: 0.7,
};

// ============================================================================
// 4. UTILITY FUNCTIONS
// ============================================================================

const getIpHash = (socket: any): string => {
  const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;
  return crypto.createHash('sha256').update(ip).digest('hex');
};

const sanitizeMessage = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, CONSTRAINTS.MSG_MAX_LENGTH);
};

const dbQuery = async (query: string, params: any[]) => {
    if (pgPool) {
        return (await pgPool.query(query, params)).rows;
    } else if (sqliteDb) {
        // Simple adaptation for SQLite syntax if different, but our queries here are mostly compatible
        const stmt = sqliteDb.prepare(query.replace(/\$[0-9]/g, '?'));
        return stmt.all(...params);
    }
    return [];
};

const dbExec = async (query: string, params: any[]) => {
    if (pgPool) {
        await pgPool.query(query, params);
    } else if (sqliteDb) {
        const stmt = sqliteDb.prepare(query.replace(/\$[0-9]/g, '?'));
        stmt.run(...params);
    }
};

const isUserBanned = async (ipHash: string): Promise<boolean> => {
  try {
    const rows = await dbQuery('SELECT banned_until FROM user_moderation WHERE ip_hash = $1', [ipHash]);
    if (!rows[0]) return false;
    return Date.now() < rows[0].banned_until;
  } catch (err) {
    console.error('Ban check error:', err);
    return false;
  }
};

const reportUser = async (ipHash: string) => {
  try {
    if (pgPool) {
        const result = await pgPool.query(
            `INSERT INTO user_moderation (ip_hash, reports, last_report_at)
             VALUES ($1, 1, $2)
             ON CONFLICT (ip_hash) DO UPDATE
             SET reports = user_moderation.reports + 1, last_report_at = $2
             RETURNING reports`,
            [ipHash, Date.now()]
        );
        if (result.rows[0].reports >= CONSTRAINTS.REPORT_THRESHOLD) {
            await pgPool.query('UPDATE user_moderation SET banned_until = $1 WHERE ip_hash = $2', [Date.now() + CONSTRAINTS.TEMP_BAN_DURATION, ipHash]);
        }
    } else if (sqliteDb) {
        const existing = sqliteDb.prepare('SELECT reports FROM user_moderation WHERE ip_hash = ?').get(ipHash);
        if (existing) {
            const newReports = existing.reports + 1;
            const bannedUntil = newReports >= CONSTRAINTS.REPORT_THRESHOLD ? Date.now() + CONSTRAINTS.TEMP_BAN_DURATION : null;
            sqliteDb.prepare('UPDATE user_moderation SET reports = ?, last_report_at = ?, banned_until = ? WHERE ip_hash = ?')
                .run(newReports, Date.now(), bannedUntil, ipHash);
        } else {
            sqliteDb.prepare('INSERT INTO user_moderation (ip_hash, reports, last_report_at) VALUES (?, 1, ?)')
                .run(ipHash, Date.now());
        }
    }
  } catch (err) {
    console.error('Report user error:', err);
  }
};

// ============================================================================
// 5. MODERATION SERVICE
// ============================================================================

class ModerationService {
    async scanMessage(text: string): Promise<{ action: 'ALLOW' | 'BLOCK' | 'FLAG'; reason?: string }> {
        // 1. Keyword Filter
        const lowerText = text.toLowerCase();
        const FORBIDDEN_WORDS = ['porn', 'xxx', 'kill', 'bomb', 'gun', 'drug'];
        for (const word of FORBIDDEN_WORDS) {
            if (lowerText.includes(word)) {
                return { action: 'BLOCK', reason: 'FORBIDDEN_CONTENT' };
            }
        }

        // 2. Perspective API (if key exists)
        if (process.env.PERSPECTIVE_API_KEY) {
            try {
                const perspectiveResponse = await axios.post(
                    `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyzeComment`,
                    { comment: { text }, requestedAttributes: { TOXICITY: {} } },
                    { params: { key: process.env.PERSPECTIVE_API_KEY } }
                );
                if (perspectiveResponse.data.attributeScores.TOXICITY?.summaryScore?.value > CONSTRAINTS.PERSPECTIVE_API_THRESHOLD) {
                    return { action: 'BLOCK', reason: 'TOXIC' };
                }
            } catch (err) {
                console.error('Perspective API Error:', err);
            }
        }

        // 3. Spam Detection
        const urlCount = (text.match(/http/gi) || []).length;
        if (urlCount > 2) return { action: 'FLAG', reason: 'SPAM' };

        return { action: 'ALLOW' };
    }

    async scanImage(imageData: string): Promise<{ action: 'ALLOW' | 'BLOCK', reason?: string }> {
        console.log('🖼️ Scanning image for prohibited content...');
        if (imageData.includes('forbidden_hash_signal')) {
            return { action: 'BLOCK', reason: 'CSAM_OR_PROHIBITED' };
        }
        return { action: 'ALLOW' };
    }
}

const moderation = new ModerationService();

// ============================================================================
// 6. MATCHING SERVICE
// ============================================================================

class MatchingService {
  private queue = new Map<string, SocketSession>();

  async findMatch(session: SocketSession): Promise<string | null> {
    console.log(`🔍 Searching match for ${session.user.id}. Language: ${session.user.language}`);
    const candidates = Array.from(this.queue.values()).filter(s => {
      const isQualified = s.state === 'waiting' && s.user.id !== session.user.id && s.user.language === session.user.language;
      return isQualified;
    });

    console.log(`👥 Found ${candidates.length} candidates.`);

    if (candidates.length === 0) {
      this.queue.set(session.user.id, session);
      console.log(`⏳ No candidates. Added ${session.user.id} to queue. Room count: ${this.queue.size}`);
      return null;
    }

    const scored = candidates.map(candidate => ({
      session: candidate,
      score: this.scoreMatch(session, candidate)
    }));

    const best = scored.sort((a, b) => b.score - a.score)[0];
    return best.session.user.id;
  }

  private scoreMatch(user1: SocketSession, user2: SocketSession): number {
    const interestOverlap = user1.user.interests.filter(i => user2.user.interests.includes(i)).length / Math.max(user1.user.interests.length, 1);
    const tzDiff = Math.abs(parseInt(user1.user.timezone) - parseInt(user2.user.timezone));
    const tzProximity = Math.max(0, 1 - tzDiff / 12);
    const langMatch = user1.user.language === user2.user.language ? 1 : 0.5;
    return interestOverlap * 0.5 + tzProximity * 0.3 + langMatch * 0.2;
  }

  removeFromQueue(userId: string) {
    this.queue.delete(userId);
  }
}

const matcher = new MatchingService();

// ============================================================================
// 7. SOCKET.IO EVENT HANDLERS
// ============================================================================

const socketSessions = new Map<string, SocketSession>();

io.on('connection', async (socket) => {
  const ipHash = getIpHash(socket);
  
  if (await isUserBanned(ipHash)) {
      socket.emit('banned', 'Temporarily restricted.');
      socket.disconnect(true);
      return;
  }

  const user: User = { id: uuidv4(), ipHash, interests: [], language: 'en', timezone: '0', isPremium: false, isVerified: false };
  const session: SocketSession = { state: 'idle', user, partnerId: null, roomId: null, lastMsgAt: 0, reportsSent: 0, matchedAt: 0, streak: 0 };
  socketSessions.set(socket.id, session);

  socket.emit('online_count', socketSessions.size);
  io.emit('online_count', socketSessions.size);

  socket.on('find_match', async (data: { interests?: string[] } = {}) => {
    const session = socketSessions.get(socket.id);
    if (!session || Date.now() - session.matchedAt < CONSTRAINTS.MATCH_COOLDOWN_MS) return;
    session.matchedAt = Date.now();
    if (data.interests) session.user.interests = data.interests;

    const matchedUserId = await matcher.findMatch(session);
    if (matchedUserId) {
      const matchedSocket = Array.from(io.sockets.sockets.values()).find(s => socketSessions.get(s.id)?.user.id === matchedUserId);
      if (matchedSocket) {
        const roomId = uuidv4();
        const matchedSession = socketSessions.get(matchedSocket.id)!;
        session.state = 'chatting'; session.partnerId = matchedUserId; session.roomId = roomId; session.streak++;
        matchedSession.state = 'chatting'; matchedSession.partnerId = session.user.id; matchedSession.roomId = roomId; matchedSession.streak++;
        socket.join(roomId); matchedSocket.join(roomId);
        matcher.removeFromQueue(session.user.id); matcher.removeFromQueue(matchedUserId);
        socket.emit('matched', { streak: session.streak });
        matchedSocket.emit('matched', { streak: matchedSession.streak });
      }
    } else {
      session.state = 'waiting';
      socket.emit('searching');
    }
  });

  socket.on('send_msg', async (rawText: string) => {
    const session = socketSessions.get(socket.id);
    if (!session || session.state !== 'chatting' || Date.now() - session.lastMsgAt < CONSTRAINTS.MSG_RATE_LIMIT_MS) return;
    const text = sanitizeMessage(rawText);
    if (!text) return;
    session.lastMsgAt = Date.now();

    const modResult = await moderation.scanMessage(text);
    if (modResult.action === 'BLOCK') {
      socket.emit('sys_error', 'Blocked.');
      return;
    }

    dbExec('INSERT INTO messages (id, session_id, sender_id, text, moderation_score, created_at) VALUES ($1, $2, $3, $4, $5, $6)', 
           [uuidv4(), session.roomId, session.user.id, text, modResult.action === 'FLAG' ? 0.5 : 0, Date.now()])
           .catch(console.error);

    socket.to(session.roomId!).emit('receive_msg', { text });
  });

  socket.on('typing', (bool) => {
    const session = socketSessions.get(socket.id);
    if (session?.roomId) socket.to(session.roomId).emit('partner_typing', bool);
  });

  socket.on('report_user', async (data) => {
    const session = socketSessions.get(socket.id);
    if (!session || session.state !== 'chatting' || session.reportsSent >= 3) return;
    const partnerSession = Array.from(socketSessions.values()).find(s => s.user.id === session.partnerId);
    if (partnerSession) {
        await reportUser(partnerSession.user.ipHash);
        session.reportsSent++;
        dbExec('INSERT INTO reports (id, reporter_id, reported_user_id, session_id, reason, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
               [uuidv4(), session.user.id, partnerSession.user.id, session.roomId, data.reason, Date.now()]).catch(console.error);
        socket.emit('sys_info', 'Reported.');
    }
  });

  socket.on('leave_chat', () => {
    const session = socketSessions.get(socket.id);
    if (session?.roomId) {
        socket.to(session.roomId).emit('partner_left');
        const partnerSocket = Array.from(io.sockets.sockets.values()).find(s => socketSessions.get(s.id)?.roomId === session.roomId && s.id !== socket.id);
        if (partnerSocket) {
            const ps = socketSessions.get(partnerSocket.id);
            if (ps) { ps.state = 'idle'; ps.roomId = null; ps.partnerId = null; }
            partnerSocket.leave(session.roomId);
        }
        socket.leave(session.roomId);
    }
    if (session) { session.state = 'idle'; session.roomId = null; session.partnerId = null; matcher.removeFromQueue(session.user.id); }
  });

  socket.on('disconnect', () => {
    const session = socketSessions.get(socket.id);
    if (session?.roomId) socket.to(session.roomId).emit('partner_left');
    if (session) matcher.removeFromQueue(session.user.id);
    socketSessions.delete(socket.id);
    io.emit('online_count', socketSessions.size);
  });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Stripe Checkout Session Creation
app.post('/api/checkout/session', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(501).json({ error: 'Stripe is not configured.' });
        }

        const { priceId, userId } = req.body;
        if (!priceId) return res.status(400).json({ error: 'Missing priceId' });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/chat?success=true`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/chat?canceled=true`,
            metadata: { userId }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (err: any) {
        console.error('Stripe Session Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Stripe Webhook
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
        if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
            return res.status(501).send('Webhook secret not configured');
        }
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const userId = session.metadata.userId;

        console.log(`🔔 Payment successful for user ${userId}`);
        
        // Update user status
        await dbExec('UPDATE users SET is_premium = 1 WHERE id = $1', [userId]);
        await dbExec('INSERT INTO premium_subscriptions (id, user_id, status, created_at) VALUES ($1, $2, $3, $4)',
                     [session.id, userId, 'active', Date.now()]);
    }

    res.json({ received: true });
});

// Support Appeals
app.post('/api/support/appeal', async (req, res) => {
    const { ipHash, email, reason } = req.body;
    console.log(`📩 Appeal received from ${ipHash} (${email}): ${reason}`);
    // In a real app, this would save to a database for admin review
    res.json({ success: true, message: 'Appeal submitted.' });
});

// Admin API (Mock Protection)
app.get('/api/admin/stats', (req, res) => {
    // In production, check admin token
    res.json({
        onlineCount: socketSessions.size,
        activeRooms: Array.from(socketSessions.values()).filter(s => s.state === 'chatting').length / 2,
        waitingQueue: matcher['queue'].size, // Access private for mock admin
        uptime: process.uptime()
    });
});

app.get('/api/admin/reports', async (req, res) => {
    const reports = await dbQuery('SELECT * FROM reports ORDER BY created_at DESC LIMIT 50', []);
    res.json(reports);
});

app.post('/api/admin/ban', async (req, res) => {
    const { ipHash, duration } = req.body;
    const bannedUntil = Date.now() + (duration || CONSTRAINTS.TEMP_BAN_DURATION);
    await dbExec('INSERT INTO user_moderation (ip_hash, banned_until) VALUES ($1, $2) ON CONFLICT (ip_hash) DO UPDATE SET banned_until = $2', [ipHash, bannedUntil]);
    res.json({ success: true });
});

initStorage().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server on port ${PORT}`);
    });
});

process.on('SIGTERM', () => {
  server.close(() => {
    if (pgPool) pgPool.end();
    process.exit(0);
  });
});

export { app, server, io };
