import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// ============================================
// 1. CONFIGURATION & ENVIRONMENT
// ============================================

const CONFIG = {
    PORT: Number(process.env.PORT) || 3000,
    NODE_ENV: process.env.NODE_ENV || 'production',
    DB_NAME: process.env.DB_NAME || 'moderation.db',
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true',
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://strngr.chat',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['https://strngr.chat', 'http://localhost:3000'],
    SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    PERSPECTIVE_API_KEY: process.env.PERSPECTIVE_API_KEY || '',
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
    REDIS_URL: process.env.REDIS_URL || '',
};

const CONSTRAINTS = {
    MSG_MAX_LENGTH: 2000,
    MSG_RATE_LIMIT_MS: 500,
    REQUEUE_COOLDOWN_MS: 2000,
    BANNED_WORDS: process.env.BANNED_WORDS ?
        process.env.BANNED_WORDS.split(',').map(w => w.trim().toLowerCase()) :
        ['spamlink.com', 'badword1', 'viagra', 'casino'],
    REPORT_THRESHOLD: 5,
    TEMP_BAN_DURATION: 1000 * 60 * 60 * 24,
    REPORT_RATE_LIMIT: 5,
    REPORT_RATE_WINDOW: 60 * 60 * 1000,
    CONN_RATE_LIMIT: 15,
    CONN_RATE_WINDOW_MS: 60 * 1000,
    FILTER_VIOLATION_THRESHOLD: 5,
    MAX_CONCURRENT_CONNECTIONS: 10000,
    MATCH_TIMEOUT_MS: 30000,
    CACHE_TTL_BAN: 30000,
    CACHE_TTL_PREMIUM: 10000,
};

// ============================================
// 2. LOGGING & ERROR HANDLING
// ============================================

const log = {
    info: (...args) => console.log(`[INFO ${new Date().toISOString()}]`, ...args),
    warn: (...args) => console.warn(`[WARN ${new Date().toISOString()}]`, ...args),
    error: (...args) => console.error(`[ERROR ${new Date().toISOString()}]`, ...args),
    debug: (...args) => {
        if (CONFIG.NODE_ENV === 'development') {
            console.log(`[DEBUG ${new Date().toISOString()}]`, ...args);
        }
    }
};

process.on('uncaughtException', (err) => {
    log.error('CRITICAL - Uncaught Exception:', err.stack || err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    log.error('CRITICAL - Unhandled Rejection:', reason);
});

log.info(`Starting StrangerChat in ${CONFIG.NODE_ENV} mode on port ${CONFIG.PORT}`);

// ============================================
// 3. DATABASE INITIALIZATION
// ============================================

const dbPath = CONFIG.NODE_ENV === 'production'
    ? path.join('/tmp', 'strangerchat_db')
    : path.join(process.cwd(), 'db');

if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
    log.info(`Created database directory: ${dbPath}`);
}

const db = new Database(path.join(dbPath, CONFIG.DB_NAME));
log.info(`Database initialized at ${path.join(dbPath, CONFIG.DB_NAME)}`);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS user_moderation (
        ip_hash TEXT PRIMARY KEY,
        reports INTEGER DEFAULT 0,
        banned_until INTEGER DEFAULT NULL,
        last_report_at INTEGER,
        filter_violations INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user1_hash TEXT NOT NULL,
        user2_hash TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        message_count INTEGER DEFAULT 0,
        reported BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        user_hash TEXT,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS premium_users (
        user_hash TEXT PRIMARY KEY,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        status TEXT DEFAULT 'active',
        started_at INTEGER NOT NULL,
        expires_at INTEGER,
        referral_code TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        user_hash TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        text TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
        approved INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS free_usage_limits (
        user_hash TEXT PRIMARY KEY,
        match_count INTEGER DEFAULT 0,
        window_start INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_moderation_banned ON user_moderation(banned_until);
    CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
`);

// Add new columns to existing tables (safe to run repeatedly)
try { db.exec(`ALTER TABLE user_moderation ADD COLUMN match_count INTEGER DEFAULT 0`); } catch (e) { /* column may already exist */ }
try { db.exec(`ALTER TABLE sessions ADD COLUMN duration_seconds INTEGER DEFAULT 0`); } catch (e) { /* column may already exist */ }
try { db.exec(`ALTER TABLE premium_users ADD COLUMN payment_ref TEXT`); } catch (e) { /* column may already exist */ }
try { db.exec(`ALTER TABLE premium_users ADD COLUMN plan_type TEXT DEFAULT 'premium'`); } catch (e) { /* column may already exist */ }

// Analytics tables
db.exec(`
    CREATE TABLE IF NOT EXISTS page_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        country TEXT DEFAULT 'Unknown',
        city TEXT DEFAULT 'Unknown',
        page_url TEXT NOT NULL,
        user_agent TEXT DEFAULT '',
        referrer TEXT DEFAULT '',
        visited_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        ip_address TEXT DEFAULT '',
        country TEXT DEFAULT 'Unknown',
        city TEXT DEFAULT 'Unknown',
        user_agent TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS geoip_cache (
        ip_address TEXT PRIMARY KEY,
        country TEXT DEFAULT 'Unknown',
        city TEXT DEFAULT 'Unknown',
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_visits_visited ON page_visits(visited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_visits_ip ON page_visits(ip_address);
    CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
`);

log.info('Analytics schema initialized');

// ============================================
// 3b. GEOIP HELPER
// ============================================

async function lookupGeoIP(ipAddress) {
    // Skip private/internal IPs
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
        return { country: 'Local', city: 'Local' };
    }

    // Check cache first
    try {
        const cached = db.prepare('SELECT country, city FROM geoip_cache WHERE ip_address = ?').get(ipAddress);
        if (cached) return { country: cached.country, city: cached.city };
    } catch (e) { /* ignore */ }

    // Fetch from ip-api.com (free, no key needed, 45 req/min limit)
    try {
        const response = await fetch(`https://ip-api.com/json/${ipAddress}?fields=country,city`);
        if (response.ok) {
            const data = await response.json();
            const country = data.country || 'Unknown';
            const city = data.city || 'Unknown';
            // Cache it
            db.prepare('INSERT OR REPLACE INTO geoip_cache (ip_address, country, city, updated_at) VALUES (?, ?, ?, ?)')
                .run(ipAddress, country, city, Date.now());
            return { country, city };
        }
    } catch (e) { /* geolocation failed, fall through */ }

    return { country: 'Unknown', city: 'Unknown' };
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || req.ip
        || '0.0.0.0';
}

// ============================================
// 4. EXPRESS APP SETUP
// ============================================

const app = express();

// Security & Performance Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.socket.io", "cdn.tailwindcss.com", "cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (CONFIG.ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', apiLimiter);

// Maintenance mode
if (CONFIG.MAINTENANCE_MODE) {
    app.use((req, res) => {
        res.status(503).send(`<!DOCTYPE html><html><head><title>StrangerChat - Maintenance</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}.icon{font-size:64px;margin-bottom:16px}h1{font-size:32px;font-weight:700;margin-bottom:12px}p{color:#888;max-width:400px;margin:0 auto}</style></head><body><div><div class="icon">🔧</div><h1>Under Maintenance</h1><p>StrangerChat is getting upgrades. We'll be back shortly!</p></div></body></html>`);
    });
}

// Static files — serve the built React app
app.use(express.static(path.join(__dirname, '../dist'), {
    maxAge: '1d',
    etag: true,
}));

// Visitor tracking middleware (after static files, so API/asset requests are skipped early)
app.use(async (req, res, next) => {
    if (!CONFIG.ENABLE_ANALYTICS || req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/socket.io/') || req.path.startsWith('/styles/') || req.path.startsWith('/fonts/') || req.path.match(/\.(js|css|png|jpg|ico|svg|woff2?|json)$/i)) {
        return next();
    }
    try {
        const ipAddress = getClientIP(req);
        const hashedIp = crypto.createHash('sha256').update(ipAddress + CONFIG.SESSION_SECRET).digest('hex').substring(0, 16);
        const pageUrl = req.path;
        const userAgent = req.headers['user-agent'] || '';
        const referrer = req.headers['referer'] || '';
        lookupGeoIP(ipAddress).then(geo => {
            db.prepare(`INSERT INTO page_visits (ip_address, country, city, page_url, user_agent, referrer) VALUES (?, ?, ?, ?, ?, ?)`)
                .run(hashedIp, geo.country, geo.city, pageUrl, userAgent, referrer);
        }).catch(() => {
            db.prepare(`INSERT INTO page_visits (ip_address, country, city, page_url, user_agent, referrer) VALUES (?, ?, ?, ?, ?, ?)`)
                .run(hashedIp, 'Unknown', 'Unknown', pageUrl, userAgent, referrer);
        });
    } catch (e) { log.error('Error tracking visit:', e.message); }
    next();
});

// ============================================
// 5. API ENDPOINTS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    const stats = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: Date.now(),
        connections: socketStates.size,
        waitingQueue: waitingQueue.length,
        memory: process.memoryUsage(),
    };
    res.json(stats);
});

// Analytics endpoint
app.get('/api/stats', (req, res) => {
    const online = socketStates.size;
    const waiting = waitingQueue.length;
    const activeSessions = Math.floor(Array.from(socketStates.values())
        .filter(s => s.state === 'chatting').length / 2);

    res.json({
        online,
        waiting,
        activeSessions,
        timestamp: Date.now(),
    });
});

// Get reviews
app.get('/api/reviews', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT id, rating, text, created_at
            FROM reviews
            WHERE approved = 1
            ORDER BY created_at DESC
            LIMIT 20
        `).all();
        res.json(reviews);
    } catch (err) {
        log.error('Error fetching reviews:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User stats endpoint (for logged-in users)
app.get('/api/user/stats/:userHash', (req, res) => {
    try {
        const { userHash } = req.params;

        // Get session count
        const sessionCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM sessions
            WHERE user1_hash = ? OR user2_hash = ?
        `).get(userHash, userHash);

        // Get ban status
        const moderation = db.prepare(`
            SELECT * FROM user_moderation WHERE ip_hash = ?
        `).get(userHash);

        // Get premium status
        const premium = db.prepare(`
            SELECT * FROM premium_users WHERE user_hash = ?
        `).get(userHash);

        res.json({
            sessionCount: sessionCount.count || 0,
            isBanned: moderation && moderation.banned_until > Date.now(),
            reports: moderation?.reports || 0,
            isPremium: premium && premium.status === 'active' && premium.expires_at > Date.now(),
            premiumExpiry: premium?.expires_at || null,
        });
    } catch (err) {
        log.error('Error fetching user stats:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Report endpoint
app.post('/api/report', express.json(), (req, res) => {
    try {
        const { sessionId, reason } = req.body;

        if (!sessionId || !reason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Log report for review
        db.prepare(`
            UPDATE sessions
            SET reported = 1
            WHERE id = ?
        `).run(sessionId);

        res.json({ success: true, message: 'Report submitted successfully' });
    } catch (err) {
        log.error('Error submitting report:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Premium check endpoint
app.get('/api/premium/check/:userHash', (req, res) => {
    try {
        const { userHash } = req.params;
        const premium = db.prepare(`
            SELECT * FROM premium_users
            WHERE user_hash = ?
            AND status = 'active'
            AND expires_at > ?
        `).get(userHash, Date.now());

        res.json({
            isPremium: !!premium,
            expiresAt: premium?.expires_at || null,
        });
    } catch (err) {
        log.error('Error checking premium status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Activate premium (local payment tracking)
app.post('/api/premium/activate', express.json(), (req, res) => {
    try {
        const userHash = req.body.userHash || req.body.user_hash;
        const paymentRef = req.body.paymentRef || req.body.payment_ref;
        if (!userHash || !paymentRef) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const now = Date.now();
        const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

        db.prepare(`
            INSERT INTO premium_users (user_hash, status, started_at, expires_at, payment_ref, plan_type)
            VALUES (?, 'active', ?, ?, ?, 'premium')
            ON CONFLICT(user_hash) DO UPDATE SET
                status = 'active',
                started_at = ?,
                expires_at = ?,
                payment_ref = excluded.payment_ref,
                plan_type = 'premium'
        `).run(userHash, now, expiresAt, paymentRef, now, expiresAt);

        res.json({ success: true, expiresAt });
    } catch (err) {
        log.error('Error activating premium:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// 5a. ANALYTICS & ADMIN API
// ============================================

// Email subscription (after chat ends)
app.post('/api/subscribe', express.json(), async (req, res) => {
    try {
        const { email, userHash } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, error: 'Valid email required' });
        }

        const ipAddress = getClientIP(req);
        const hashedIp = crypto.createHash('sha256').update(ipAddress + CONFIG.SESSION_SECRET).digest('hex').substring(0, 16);
        const userAgent = req.headers['user-agent'] || '';

        // Look up geo info
        const geo = await lookupGeoIP(ipAddress);

        db.prepare(`
            INSERT OR IGNORE INTO subscribers (email, ip_address, country, city, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `).run(email.toLowerCase().trim(), hashedIp, geo.country, geo.city, userAgent);

        // Log to analytics
        db.prepare(`
            INSERT INTO analytics_events (id, event_type, user_hash, metadata, created_at)
            VALUES (?, 'subscribe', ?, ?, ?)
        `).run(uuidv4(), userHash || null, JSON.stringify({ email }), Date.now());

        res.json({ success: true, message: 'Subscribed successfully!' });
    } catch (err) {
        log.error('Error subscribing:', err);
        if (err.message?.includes('UNIQUE')) {
            return res.json({ success: true, message: 'Already subscribed!' });
        }
        res.status(500).json({ success: false, error: 'Internal error' });
    }
});

// Admin: get summary statistics
app.get('/api/admin/summary', (req, res) => {
    try {
        const totalPageviews = db.prepare('SELECT COUNT(*) as count FROM page_visits').get().count;
        const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT ip_address) as count FROM page_visits').get().count;
        const todayVisits = db.prepare("SELECT COUNT(*) as count FROM page_visits WHERE date(visited_at) = date('now', 'localtime')").get().count;
        const todayUnique = db.prepare("SELECT COUNT(DISTINCT ip_address) as count FROM page_visits WHERE date(visited_at) = date('now', 'localtime')").get().count;
        const totalSubscribers = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;
        const totalMatches = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
        const totalPremium = db.prepare("SELECT COUNT(*) as count FROM premium_users WHERE status = 'active'").get().count;

        res.json({
            summary: {
                total_pageviews: totalPageviews,
                unique_visitors: uniqueVisitors,
                today_pageviews: todayVisits,
                today_unique: todayUnique,
                total_subscribers: totalSubscribers,
                total_matches: totalMatches,
                total_premium: totalPremium,
            }
        });
    } catch (err) {
        log.error('Error fetching admin summary:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Admin: get daily breakdown (last 30 days)
app.get('/api/admin/daily', (req, res) => {
    try {
        const daily = db.prepare(`
            SELECT date(visited_at) as day,
                   COUNT(*) as visits,
                   COUNT(DISTINCT ip_address) as unique_visitors
            FROM page_visits
            WHERE visited_at >= datetime('now', '-30 days', 'localtime')
            GROUP BY date(visited_at)
            ORDER BY day DESC
        `).all();
        res.json({ daily_breakdown: daily });
    } catch (err) {
        log.error('Error fetching daily breakdown:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Admin: get top countries
app.get('/api/admin/countries', (req, res) => {
    try {
        const countries = db.prepare(`
            SELECT country,
                   COUNT(*) as visits,
                   COUNT(DISTINCT ip_address) as unique_visitors
            FROM page_visits
            WHERE country != 'Unknown'
            GROUP BY country
            ORDER BY visits DESC
            LIMIT 50
        `).all();
        res.json({ top_countries: countries });
    } catch (err) {
        log.error('Error fetching top countries:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Admin: get top cities
app.get('/api/admin/cities', (req, res) => {
    try {
        const cities = db.prepare(`
            SELECT city, country,
                   COUNT(*) as visits
            FROM page_visits
            WHERE city != 'Unknown'
            GROUP BY city, country
            ORDER BY visits DESC
            LIMIT 50
        `).all();
        res.json({ top_cities: cities });
    } catch (err) {
        log.error('Error fetching top cities:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Admin: get top pages
app.get('/api/admin/pages', (req, res) => {
    try {
        const pages = db.prepare(`
            SELECT page_url,
                   COUNT(*) as views
            FROM page_visits
            GROUP BY page_url
            ORDER BY views DESC
            LIMIT 50
        `).all();
        res.json({ top_pages: pages });
    } catch (err) {
        log.error('Error fetching top pages:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Admin: get recent visitors
app.get('/api/admin/recent-visitors', (req, res) => {
    try {
        const visitors = db.prepare(`
            SELECT ip_address, country, city, page_url, user_agent, referrer, visited_at
            FROM page_visits
            ORDER BY visited_at DESC
            LIMIT 100
        `).all();
        res.json({ recent_visitors: visitors });
    } catch (err) {
        log.error('Error fetching recent visitors:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Admin: get subscribers
app.get('/api/admin/subscribers', (req, res) => {
    try {
        const subscribers = db.prepare(`
            SELECT email, ip_address, country, city, user_agent, created_at
            FROM subscribers
            ORDER BY created_at DESC
            LIMIT 100
        `).all();
        res.json({ subscribers });
    } catch (err) {
        log.error('Error fetching subscribers:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Admin: get chat sessions log
app.get('/api/admin/sessions', (req, res) => {
    try {
        const sessions = db.prepare(`
            SELECT id, user1_hash, user2_hash, started_at, ended_at, message_count, reported, duration_seconds
            FROM sessions
            ORDER BY started_at DESC
            LIMIT 100
        `).all();
        res.json({ sessions });
    } catch (err) {
        log.error('Error fetching sessions:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// SPA fallback — serve React app for all non-API routes (client-side routing)
app.use((req, res) => {
    res.status(200).sendFile(path.join(__dirname, '../dist/index.html'));
});

// ============================================
// 6. SOCKET.IO SERVER
// ============================================

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CONFIG.ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true
    },
    maxHttpBufferSize: 1e4, // 10KB
    pingTimeout: 60000,
    pingInterval: 25000,
});

// ============================================
// 7. STATE MANAGEMENT — Nanosecond-optimized
// ============================================

const socketStates = new Map();
const connectionRates = new Map();

// waitingQueue uses a doubly-linked-list-like approach:
//   waitingQueue.order[] — insertion-ordered IDs for FIFO
//   waitingQueue.index   — pointer to first unserved entry (avoids O(n) shift)
//   waitingQueue.lookup  — Set of IDs currently in queue for O(1) membership checks
const waitingQueue = {
    order: [],
    index: 0,
    lookup: new Set(),
    get length() { return this.order.length - this.index; },
    add(id) {
        if (this.lookup.has(id)) return;
        this.lookup.add(id);
        this.order.push(id);
    },
    remove(id) {
        if (!this.lookup.has(id)) return false;
        this.lookup.delete(id);
        return true;
    },
    shift() {
        while (this.index < this.order.length) {
            const id = this.order[this.index++];
            if (this.lookup.has(id)) {
                this.lookup.delete(id);
                return id;
            }
        }
        return undefined;
    },
    cleanup() {
        if (this.index > 1000 && this.index > this.order.length / 2) {
            this.order.splice(0, this.index);
            this.index = 0;
        }
    },
    has(id) { return this.lookup.has(id); },
};

const matchTimers = new Map();
const chatTimers = new Map();

// In-memory caches — avoid DB reads on hot path
const banCache = new Map();
const premiumCache = new Map();

const cacheGet = (cache, key, ttl) => {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < ttl) return entry.value;
    cache.delete(key);
    return undefined;
};
const cacheSet = (cache, key, value) => cache.set(key, { value, ts: Date.now() });

const isPremiumUser = (userHash) => {
    const cached = cacheGet(premiumCache, userHash, CONSTRAINTS.CACHE_TTL_PREMIUM);
    if (cached !== undefined) return cached;
    try {
        const row = db.prepare(`SELECT status, expires_at FROM premium_users WHERE user_hash = ? AND status = 'active'`).get(userHash);
        const result = !!(row && row.expires_at > Date.now());
        cacheSet(premiumCache, userHash, result);
        return result;
    } catch { return false; }
};

// ============================================
// 8. UTILITY FUNCTIONS
// ============================================

const getIpHash = (socket) => {
    const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        socket.handshake.headers['x-real-ip'] ||
        socket.handshake.address ||
        socket.request.connection.remoteAddress;
    return crypto.createHash('sha256').update(ip + CONFIG.SESSION_SECRET).digest('hex');
};

const sanitize = (text) => {
    if (typeof text !== 'string') return '';
    return text
        .trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .substring(0, CONSTRAINTS.MSG_MAX_LENGTH);
};

const containsProfanity = (text) => {
    const lowerText = text.toLowerCase();
    return CONSTRAINTS.BANNED_WORDS.some(word => lowerText.includes(word));
};

const isUserBanned = (ipHash) => {
    const cached = cacheGet(banCache, ipHash, CONSTRAINTS.CACHE_TTL_BAN);
    if (cached !== undefined) return cached;
    try {
        const row = db.prepare('SELECT banned_until FROM user_moderation WHERE ip_hash = ?').get(ipHash);
        const banned = row && row.banned_until ? Date.now() < row.banned_until : false;
        cacheSet(banCache, ipHash, banned);
        return banned;
    } catch (err) {
        log.error(`Error checking ban for ${ipHash.substring(0, 8)}:`, err);
        return false;
    }
};

const reportUser = (ipHash) => {
    const now = Date.now();
    try {
        const existing = db.prepare('SELECT reports, filter_violations FROM user_moderation WHERE ip_hash = ?').get(ipHash);

        if (existing) {
            const newReports = existing.reports + 1;
            let bannedUntil = null;

            if (newReports >= CONSTRAINTS.REPORT_THRESHOLD * 3) {
                bannedUntil = now + (CONSTRAINTS.TEMP_BAN_DURATION * 7);
            } else if (newReports >= CONSTRAINTS.REPORT_THRESHOLD * 2) {
                bannedUntil = now + (CONSTRAINTS.TEMP_BAN_DURATION * 3);
            } else if (newReports >= CONSTRAINTS.REPORT_THRESHOLD) {
                bannedUntil = now + CONSTRAINTS.TEMP_BAN_DURATION;
            }

            db.prepare(`
                UPDATE user_moderation
                SET reports = ?, banned_until = ?, last_report_at = ?
                WHERE ip_hash = ?
            `).run(newReports, bannedUntil, now, ipHash);

            if (bannedUntil) cacheSet(banCache, ipHash, true);
        } else {
            db.prepare(`
                INSERT INTO user_moderation (ip_hash, reports, last_report_at)
                VALUES (?, 1, ?)
            `).run(ipHash, now);
        }
    } catch (err) {
        log.error(`Error reporting user ${ipHash.substring(0, 8)}:`, err);
    }
};

const cleanupSession = (socketId) => {
    const session = socketStates.get(socketId);
    if (!session) return;

    if (matchTimers.has(socketId)) {
        clearTimeout(matchTimers.get(socketId));
        matchTimers.delete(socketId);
    }

    if (session.roomId && matchTimers.has(`dur_${session.roomId}`)) {
        clearTimeout(matchTimers.get(`dur_${session.roomId}`));
        matchTimers.delete(`dur_${session.roomId}`);
    }

    if (chatTimers.has(socketId)) {
        clearTimeout(chatTimers.get(socketId));
        chatTimers.delete(socketId);
    }

    const partnerId = session.partnerId;
    if (session.state === 'chatting' && partnerId) {
        const partnerSession = socketStates.get(partnerId);
        if (partnerSession && partnerSession.partnerId === socketId) {
            const partnerSocket = io.sockets.sockets.get(partnerId);
            if (partnerSocket && !partnerSocket.disconnected) {
                partnerSocket.emit('partner_left');
                partnerSession.state = 'idle';
                partnerSession.partnerId = null;
                partnerSession.roomId = null;
                if (session.roomId) partnerSocket.leave(session.roomId);
            }
        }

        if (session.roomId) {
            setImmediate(() => {
                try {
                    const existing = db.prepare('SELECT message_count FROM sessions WHERE id = ?').get(session.roomId);
                    if (existing) {
                        db.prepare(`
                            UPDATE sessions SET ended_at = ?, message_count = MAX(message_count, ?) WHERE id = ?
                        `).run(Date.now(), session.messageCount || 0, session.roomId);
                    } else {
                        db.prepare(`
                            INSERT INTO sessions (id, user1_hash, user2_hash, started_at, ended_at, message_count)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).run(
                            session.roomId,
                            session.ipHash,
                            partnerSession?.ipHash || 'unknown',
                            session.chatStartedAt || Date.now(),
                            Date.now(),
                            session.messageCount || 0
                        );
                    }
                } catch (err) {
                    log.error('Error saving session:', err);
                }
            });
        }

        if (session.messageCount > 0) {
            const leaverSocket = io.sockets.sockets.get(socketId);
            if (leaverSocket && !leaverSocket.disconnected) {
                leaverSocket.emit('request_review', { sessionId: session.roomId });
            }
            if (partnerId) {
                const partnerSock = io.sockets.sockets.get(partnerId);
                if (partnerSock && !partnerSock.disconnected) {
                    const partnerSess = socketStates.get(partnerId);
                    if (partnerSess && partnerSess.messageCount > 0) {
                        partnerSock.emit('request_review', { sessionId: session.roomId });
                    }
                }
            }
        }
    }

    waitingQueue.remove(socketId);
};

// Track analytics event
const trackEvent = (eventType, userHash, metadata = {}) => {
    if (!CONFIG.ENABLE_ANALYTICS) return;

    try {
        db.prepare(`
            INSERT INTO analytics_events (id, event_type, user_hash, metadata)
            VALUES (?, ?, ?, ?)
        `).run(uuidv4(), eventType, userHash, JSON.stringify(metadata));
    } catch (err) {
        log.error('Error tracking event:', err);
    }
};

// ============================================
// 9. SOCKET.IO EVENT HANDLERS
// ============================================

io.on('connection', (socket) => {
    const ipHash = getIpHash(socket);
    const now = Date.now();

    const rate = connectionRates.get(ipHash) || { count: 0, windowStart: now };
    if (now - rate.windowStart > CONSTRAINTS.CONN_RATE_WINDOW_MS) {
        rate.count = 1;
        rate.windowStart = now;
    } else {
        rate.count++;
    }
    connectionRates.set(ipHash, rate);

    if (rate.count > CONSTRAINTS.CONN_RATE_LIMIT) {
        log.warn(`Rate limited connection: ${ipHash.substring(0, 8)}`);
        socket.emit('sys_error', 'Too many connection attempts. Please wait a minute.');
        socket.disconnect(true);
        return;
    }

    if (socketStates.size >= CONSTRAINTS.MAX_CONCURRENT_CONNECTIONS) {
        socket.emit('sys_error', 'Server is at capacity. Please try again later.');
        socket.disconnect(true);
        return;
    }

    if (isUserBanned(ipHash)) {
        log.info(`Banned connection attempt: ${ipHash.substring(0, 8)}`);
        socket.emit('banned', { reason: 'You are temporarily banned due to multiple reports.' });
        socket.disconnect(true);
        return;
    }

    log.debug(`Connection: ${socket.id} (Hash: ${ipHash.substring(0, 8)})`);

    socketStates.set(socket.id, {
        state: 'idle',
        partnerId: null,
        roomId: null,
        lastMsgAt: 0,
        lastMatchAt: 0,
        ipHash,
        reportsSent: 0,
        lastReportAt: 0,
        filterViolations: 0,
        messageCount: 0,
        connectedAt: now,
    });

    setImmediate(() => trackEvent('connection', ipHash, { socketId: socket.id }));

    socket.emit('online_count', socketStates.size);
    socket.emit('connected', { success: true });
    socket.emit('user_hash', ipHash);

    socket.on('submit_review', (data) => {
        const session = socketStates.get(socket.id);
        if (!session) return;
        const rating = parseInt(data?.rating);
        const text = typeof data?.text === 'string' ? sanitize(data.text).substring(0, 500) : '';
        if (isNaN(rating) || rating < 1 || rating > 5) return;

        try {
            db.prepare(`
                INSERT INTO reviews (id, user_hash, rating, text, approved)
                VALUES (?, ?, ?, ?, 1)
            `).run(uuidv4(), session.ipHash, rating, text);
            socket.emit('sys_info', 'Thank you for your review!');
        } catch (err) {
            log.error('Error saving review:', err);
        }
    });

    // ==========================================
    // FIND MATCH — Nanosecond-optimized
    // ==========================================
    socket.on('find_match', () => {
        const session = socketStates.get(socket.id);
        if (!session) return;

        // Fast cooldown check (skip if last match was long ago)
        if (Date.now() - session.lastMatchAt < CONSTRAINTS.REQUEUE_COOLDOWN_MS) return;

        // Phase 1: Try to match immediately — no DB calls
        if (waitingQueue.length > 0) {
            let partnerId;
            let partnerSocket;
            let partnerSession;

            // Scan queue for first valid partner
            for (let i = waitingQueue.index; i < waitingQueue.order.length; i++) {
                const pid = waitingQueue.order[i];
                if (!waitingQueue.lookup.has(pid)) continue;
                const ps = io.sockets.sockets.get(pid);
                const pss = socketStates.get(pid);
                if (ps && !ps.disconnected && pss && pss.state === 'waiting') {
                    partnerId = pid;
                    partnerSocket = ps;
                    partnerSession = pss;
                    waitingQueue.remove(pid);
                    break;
                }
            }

            if (partnerId) {
                const roomId = uuidv4();
                socket.join(roomId);
                partnerSocket.join(roomId);

                session.state = 'chatting';
                session.partnerId = partnerId;
                session.roomId = roomId;
                session.lastMatchAt = Date.now();
                session.chatStartedAt = session.lastMatchAt;
                session.messageCount = 0;

                partnerSession.state = 'chatting';
                partnerSession.partnerId = socket.id;
                partnerSession.roomId = roomId;
                partnerSession.lastMatchAt = session.lastMatchAt;
                partnerSession.chatStartedAt = session.lastMatchAt;
                partnerSession.messageCount = 0;

                log.info(`MATCHED: ${socket.id} <-> ${partnerId}`);
                io.to(roomId).emit('matched', { roomId });

                // Defer ALL DB work and timers — never block match
                setImmediate(() => {
                    try {
                        const sp = db.prepare(`SELECT status, expires_at FROM premium_users WHERE user_hash = ?`).get(session.ipHash);
                        const isPremium = sp && sp.status === 'active' && sp.expires_at > Date.now();
                        cacheSet(premiumCache, session.ipHash, isPremium);

                        const pp = db.prepare(`SELECT status, expires_at FROM premium_users WHERE user_hash = ?`).get(partnerSession.ipHash);
                        const isPartnerPremium = pp && pp.status === 'active' && pp.expires_at > Date.now();
                        cacheSet(premiumCache, partnerSession.ipHash, isPartnerPremium);

                        const now = Date.now();

                        if (!isPremium) {
                            const row = db.prepare(`SELECT match_count, window_start FROM free_usage_limits WHERE user_hash = ?`).get(session.ipHash);
                            const windowStart24h = now - 24 * 60 * 60 * 1000;
                            let newCount = 1;
                            if (!row || row.window_start < windowStart24h) {
                                db.prepare(`INSERT INTO free_usage_limits (user_hash, match_count, window_start) VALUES (?, 1, ?)
                                    ON CONFLICT(user_hash) DO UPDATE SET match_count = 1, window_start = excluded.window_start`).run(session.ipHash, now);
                            } else {
                                newCount = row.match_count + 1;
                                db.prepare(`UPDATE free_usage_limits SET match_count = ? WHERE user_hash = ?`).run(newCount, session.ipHash);
                            }
                            if (newCount > 50) socket.emit('show_upgrade', { reason: 'daily_limit', matchCount: newCount });
                        }

                        if (!isPartnerPremium) {
                            const row = db.prepare(`SELECT match_count, window_start FROM free_usage_limits WHERE user_hash = ?`).get(partnerSession.ipHash);
                            const windowStart24h = now - 24 * 60 * 60 * 1000;
                            let newCount = 1;
                            if (!row || row.window_start < windowStart24h) {
                                db.prepare(`INSERT INTO free_usage_limits (user_hash, match_count, window_start) VALUES (?, 1, ?)
                                    ON CONFLICT(user_hash) DO UPDATE SET match_count = 1, window_start = excluded.window_start`).run(partnerSession.ipHash, now);
                            } else {
                                newCount = row.match_count + 1;
                                db.prepare(`UPDATE free_usage_limits SET match_count = ? WHERE user_hash = ?`).run(newCount, partnerSession.ipHash);
                            }
                            if (newCount > 50) partnerSocket.emit('show_upgrade', { reason: 'daily_limit', matchCount: newCount });
                        }

                        // Duration timer
                        const durationTimer = setTimeout(() => {
                            const s1 = socketStates.get(socket.id);
                            const s2 = socketStates.get(partnerId);
                            if (s1 && s1.state === 'chatting' && s1.roomId === roomId && !isPremiumUser(s1.ipHash))
                                socket.emit('show_upgrade', { reason: 'time_limit' });
                            if (s2 && s2.state === 'chatting' && s2.roomId === roomId && !isPremiumUser(s2.ipHash))
                                partnerSocket.emit('show_upgrade', { reason: 'time_limit' });
                        }, 10 * 60 * 1000);
                        matchTimers.set(`dur_${roomId}`, durationTimer);

                        if (!isPremium) {
                            const t = setTimeout(() => {
                                const s = socketStates.get(socket.id);
                                if (s && s.state === 'chatting') socket.emit('chat_timer_warning', { message: 'Time limit approaching. Upgrade for unlimited chat.' });
                            }, 10 * 60 * 1000);
                            chatTimers.set(socket.id, t);
                        }
                        if (!isPartnerPremium) {
                            const t = setTimeout(() => {
                                const s = socketStates.get(partnerId);
                                if (s && s.state === 'chatting') partnerSocket.emit('chat_timer_warning', { message: 'Time limit approaching. Upgrade for unlimited chat.' });
                            }, 10 * 60 * 1000);
                            chatTimers.set(partnerId, t);
                        }

                        trackEvent('match_success', session.ipHash, { partnerId, roomId });
                        trackEvent('match_success', partnerSession.ipHash, { partnerId: socket.id, roomId });
                    } catch (err) {
                        log.error('Deferred match setup error:', err);
                    }
                });

                return;
            }
        }

        // Phase 2: Quick ban check from cache (no DB)
        if (isUserBanned(session.ipHash)) {
            socket.emit('banned', { reason: 'Your ban is still active.' });
            socket.disconnect(true);
            return;
        }

        // Phase 3: Add to queue — emit searching immediately
        session.state = 'waiting';
        session.lastMatchAt = Date.now();
        waitingQueue.add(socket.id);
        socket.emit('searching');

        // Match timeout
        const timer = setTimeout(() => {
            const currentSession = socketStates.get(socket.id);
            if (currentSession && currentSession.state === 'waiting') {
                waitingQueue.remove(socket.id);
                socket.emit('match_timeout', { message: 'No matches found. Please try again.' });
                currentSession.state = 'idle';
            }
        }, CONSTRAINTS.MATCH_TIMEOUT_MS);
        matchTimers.set(socket.id, timer);

        // Deferred match limit check (for non-urgent limit warnings)
        setImmediate(() => {
            const cs = socketStates.get(socket.id);
            if (!cs || cs.state !== 'waiting') return;
            const premium = db.prepare(`SELECT status, expires_at FROM premium_users WHERE user_hash = ?`).get(session.ipHash);
            const isPremium = premium && premium.status === 'active' && premium.expires_at > Date.now();
            cacheSet(premiumCache, cs.ipHash, isPremium);
            if (!isPremium) {
                try {
                    const row = db.prepare(`SELECT match_count FROM user_moderation WHERE ip_hash = ?`).get(cs.ipHash);
                    if (row && row.match_count >= 50) {
                        socket.emit('match_limit', { message: 'Match limit reached. Upgrade for unlimited matches.' });
                        waitingQueue.remove(socket.id);
                        cs.state = 'idle';
                    }
                } catch { /* ignore */ }
            }
        });
    });

    // Send message handler
    socket.on('send_msg', (rawText) => {
        if (typeof rawText !== 'string') return;

        // Pre-sanitization length check
        if (rawText.length > CONSTRAINTS.MSG_MAX_LENGTH * 2) return;

        const text = sanitize(rawText);
        if (!text) return;

        const session = socketStates.get(socket.id);
        if (!session || session.state !== 'chatting') return;

        const now = Date.now();

        // Rate limiting
        if (now - session.lastMsgAt < CONSTRAINTS.MSG_RATE_LIMIT_MS) return;
        session.lastMsgAt = now;

        // Length check
        if (text.length > CONSTRAINTS.MSG_MAX_LENGTH) return;

        // Profanity filter with escalation
        if (containsProfanity(text)) {
            session.filterViolations++;

            if (session.filterViolations >= CONSTRAINTS.FILTER_VIOLATION_THRESHOLD) {
                const bannedUntil = now + CONSTRAINTS.TEMP_BAN_DURATION;
                try {
                    db.prepare(`
                        INSERT INTO user_moderation (ip_hash, reports, banned_until, last_report_at, filter_violations)
                        VALUES (?, 0, ?, ?, ?)
                        ON CONFLICT(ip_hash) DO UPDATE SET
                            banned_until = excluded.banned_until,
                            last_report_at = excluded.last_report_at,
                            filter_violations = excluded.filter_violations
                    `).run(session.ipHash, bannedUntil, now, session.filterViolations);
                    cacheSet(banCache, session.ipHash, true);
                } catch (err) {
                    log.error(`Error banning user ${session.ipHash.substring(0, 8)}:`, err);
                }

                socket.emit('banned', { reason: 'Banned for repeated filter violations.' });
                socket.disconnect(true);
                return;
            }

            socket.emit('sys_error', 'Message blocked by filter.');
            return;
        }

        // Send message
        session.messageCount++;
        socket.to(session.roomId).emit('receive_msg', { text, timestamp: now });

        // Track message event
        trackEvent('message_sent', session.ipHash, {
            roomId: session.roomId,
            length: text.length
        });
    });

    // Typing indicator handler
    socket.on('typing', (isTyping) => {
        if (typeof isTyping !== 'boolean') return;

        const session = socketStates.get(socket.id);
        if (session && session.state === 'chatting') {
            socket.to(session.roomId).emit('partner_typing', isTyping);
        }
    });

    // Report user handler
    socket.on('report_user', () => {
        const session = socketStates.get(socket.id);
        if (!session || session.state !== 'chatting' || !session.partnerId) return;

        const now = Date.now();

        // Time-based reset
        if (now - session.lastReportAt > CONSTRAINTS.REPORT_RATE_WINDOW) {
            session.reportsSent = 0;
        }

        // Rate limit check
        if (session.reportsSent >= CONSTRAINTS.REPORT_RATE_LIMIT) {
            socket.emit('sys_error', 'Report rate limit exceeded. Please try again later.');
            return;
        }

        const partnerSession = socketStates.get(session.partnerId);
        if (partnerSession && partnerSession.ipHash) {
            log.info(`REPORT: ${socket.id} reported ${session.partnerId} (IP: ${partnerSession.ipHash.substring(0, 8)})`);
            reportUser(partnerSession.ipHash);
            session.reportsSent++;
            session.lastReportAt = now;
            socket.emit('sys_info', 'Partner reported. Thank you for keeping the community safe.');

            // Track report event
            trackEvent('user_reported', session.ipHash, {
                reportedUser: partnerSession.ipHash,
                roomId: session.roomId
            });
        }
    });

    // Leave chat handler
    socket.on('leave_chat', () => {
        const session = socketStates.get(socket.id);
        if (!session) return;

        if (session.roomId) socket.leave(session.roomId);

        cleanupSession(socket.id);
        session.state = 'idle';
        session.partnerId = null;
        session.roomId = null;

        setImmediate(() => trackEvent('leave_chat', session.ipHash, { socketId: socket.id }));
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        const session = socketStates.get(socket.id);
        if (session) {
            setImmediate(() => trackEvent('disconnect', session.ipHash, {
                socketId: socket.id,
                duration: Date.now() - session.connectedAt,
                messagesSent: session.messageCount
            }));
        }

        cleanupSession(socket.id);
        socketStates.delete(socket.id);
        log.debug(`Disconnect: ${socket.id}`);
    });
});

// ============================================
// 10. BACKGROUND TASKS
// ============================================

setInterval(() => {
    io.emit('online_count', socketStates.size);
}, 10000);

setInterval(() => {
    connectionRates.clear();
    log.debug('Cleared connection rate limits');
}, 60 * 60 * 1000);

setInterval(() => {
    banCache.clear();
    premiumCache.clear();
    waitingQueue.cleanup();
    log.debug('Cleared in-memory caches');
}, 5 * 60 * 1000);

// Clean up expired bans daily
setInterval(() => {
    const now = Date.now();
    try {
        const result = db.prepare(`
            UPDATE user_moderation
            SET banned_until = NULL
            WHERE banned_until IS NOT NULL AND banned_until < ?
        `).run(now);

        if (result.changes > 0) {
            log.info(`Cleared ${result.changes} expired bans`);
        }
    } catch (err) {
        log.error('Error cleaning up expired bans:', err);
    }
}, 24 * 60 * 60 * 1000);

// Clean up old analytics events (keep last 30 days)
setInterval(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    try {
        const result = db.prepare(`
            DELETE FROM analytics_events WHERE created_at < ?
        `).run(thirtyDaysAgo);

        if (result.changes > 0) {
            log.info(`Cleaned up ${result.changes} old analytics events`);
        }
    } catch (err) {
        log.error('Error cleaning up analytics:', err);
    }
}, 24 * 60 * 60 * 1000);

// ============================================
// 11. GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
    log.info(`${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
        log.info('HTTP server closed');
    });

    // Notify all connected clients
    io.emit('server_shutdown', { message: 'Server is shutting down for maintenance.' });

    // Close all socket connections
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
        socket.disconnect(true);
    }

    // Close database
    db.close();
    log.info('Database closed');

    // Exit process
    setTimeout(() => {
        log.info('Shutdown complete');
        process.exit(0);
    }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================
// 12. START SERVER
// ============================================

server.listen(CONFIG.PORT, '0.0.0.0', () => {
    log.info(`✅ StrangerChat server is live on port ${CONFIG.PORT}`);
    log.info(`🌍 Environment: ${CONFIG.NODE_ENV}`);
    log.info(`📊 Max connections: ${CONSTRAINTS.MAX_CONCURRENT_CONNECTIONS}`);
    log.info(`🔒 Security: Helmet enabled, Rate limiting active`);
    log.info(`⚡ Ready to accept connections`);
});
