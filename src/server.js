import 'dotenv/config';
import { z } from 'zod';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import winston from 'winston';
import client from 'prom-client';
import geoip from 'geoip-lite';
import cookieParser from 'cookie-parser';
import webpush from 'web-push';
import session from 'express-session';
import { LRUCache } from 'lru-cache';
import cron from 'node-cron';
import auth from 'basic-auth';

/**
 * STARTUP VALIDATION
 */
const envSchema = z
  .object({
    PORT: z
      .string()
      .default('3000')
      .transform((v) => parseInt(v, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
    SESSION_SECRET: z.string().min(32),
    BASE_URL: z.string().url({ message: 'Invalid URL format' }).default('https://strngr.chat'),
    DB_NAME: z.string().default('moderation.db'),
    DEBUG: z.string().default('false'),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    MAILTO_ADDRESS: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    ADMIN_ALLOWED_IPS: z.string().optional(),
    TRUST_PROXY: z.string().default('false'),
    HIGH_RISK_COUNTRIES: z
      .string()
      .default('[]')
      .transform((val) => {
        try {
          return JSON.parse(val);
        } catch {
          return [];
        }
      }),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    PERSPECTIVE_API_KEY: z.string().optional(),
    MAINTENANCE_MODE: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    MAINTENANCE_REASON: z.string().default('System maintenance in progress'),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        const isWeakPassword =
          data.ADMIN_PASSWORD === 'strong-secret' || data.ADMIN_PASSWORD === 'password123';
        return data.ADMIN_PASSWORD.length >= 12 && !isWeakPassword;
      }
      return true;
    },
    {
      message:
        'ADMIN_PASSWORD must be at least 12 characters and not a common default in production',
      path: ['ADMIN_PASSWORD'],
    }
  )
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return !!data.SESSION_SECRET && data.SESSION_SECRET.trim().length >= 32;
      }
      return true;
    },
    {
      message: 'SESSION_SECRET is required and must be at least 32 characters in production',
      path: ['SESSION_SECRET'],
    }
  )
  .refine(
    (data) => {
      // If one VAPID key is present, the other must safely be present too
      const hasPublic = !!data.VAPID_PUBLIC_KEY;
      const hasPrivate = !!data.VAPID_PRIVATE_KEY;
      return hasPublic === hasPrivate; // Both or neither
    },
    {
      message: 'Both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be provided together',
      path: ['VAPID_PUBLIC_KEY'],
    }
  )
  .refine(
    (data) => {
      // Validate VAPID key format if provided
      if (data.VAPID_PUBLIC_KEY && data.VAPID_PRIVATE_KEY) {
        // Base64Url validation regex
        const b64Url = /^[A-Za-z0-9_-]+$/;

        const isPublicValid =
          data.VAPID_PUBLIC_KEY.length >= 87 &&
          data.VAPID_PUBLIC_KEY.startsWith('B') &&
          b64Url.test(data.VAPID_PUBLIC_KEY);

        const isPrivateValid =
          data.VAPID_PRIVATE_KEY.length >= 43 && b64Url.test(data.VAPID_PRIVATE_KEY);

        // MAILTO is required if VAPID is used (spec requirement)
        const hasMailto = !!data.MAILTO_ADDRESS;

        return isPublicValid && isPrivateValid && hasMailto;
      }
      return true;
    },
    {
      message:
        'VAPID keys must be valid format (Public: ~88 chars starting with B, Private: ~44 chars) and MAILTO_ADDRESS is required',
      path: ['VAPID_PUBLIC_KEY'],
    }
  );

const envParse = envSchema.safeParse(process.env);
if (!envParse.success) {
  // Critical startup error: Always log to stderr
  console.error('[FATAL] Environment variable validation failed:');
  envParse.error.errors.forEach((err) => {
    console.error(`- ${err.path.join('.')}: ${err.message}`);
  });
  console.error('Please refer to .env.example and update your .env file.');
  process.exit(1);
}

// Assign parsed values back to process.env
const env = envParse.data;
Object.assign(process.env, {
  ...process.env,
  PORT: env.PORT.toString(),
  DB_NAME: env.DB_NAME,
  HIGH_RISK_COUNTRIES: JSON.stringify(env.HIGH_RISK_COUNTRIES),
  LOG_LEVEL: env.LOG_LEVEL,
  MAINTENANCE_MODE: env.MAINTENANCE_MODE ? 'true' : 'false',
  MAINTENANCE_REASON: env.MAINTENANCE_REASON,
});

// --- OBSERVABILITY SETUP ---

// 1. Structured Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'strngr-server' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Always add console in production for critical startup/shutdown messages
logger.add(
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info', // In production, only show warnings and errors
  })
);

const logProduction = (level, message, meta = {}) => {
  if (process.env.NODE_ENV === 'production') {
    logger[level](message, meta);
  } else {
    // Development-only logging
    console[level === 'error' ? 'error' : 'log'](message, meta);
  }
};

let pushNotificationsEnabled = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    const subject = process.env.MAILTO_ADDRESS || 'admin@strngr.chat';
    const mailtoSubject = subject.startsWith('mailto:') ? subject : `mailto:${subject}`;

    // Additional runtime validation
    const pubKey = process.env.VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;
    const b64Url = /^[A-Za-z0-9_-]+$/;

    if (!b64Url.test(pubKey) || !b64Url.test(privKey)) {
      throw new Error('Invalid VAPID key format (base64url required)');
    }

    webpush.setVapidDetails(mailtoSubject, pubKey, privKey);
    pushNotificationsEnabled = true;
    logger.info('Push notifications configured successfully');
  } catch (err) {
    logger.error('Failed to configure push notifications', { error: err.message });
    pushNotificationsEnabled = false;
  }
} else {
  logger.warn('VAPID keys are missing. Push notifications will be disabled.');
  // Development-only logging
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Run "npx web-push generate-vapid-keys" to generate them.');
  }
}

// 2. Metrics Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Define Custom Metrics
const metrics = {
  httpRequestDuration: new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register],
  }),
  connectedUsers: new client.Gauge({
    name: 'strngr_connected_users',
    help: 'Number of currently connected Socket.IO users',
    registers: [register],
  }),
  matchmakingDuration: new client.Histogram({
    name: 'strngr_matchmaking_duration_seconds',
    help: 'Time taken to find a match',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [register],
  }),
  messageCounter: new client.Counter({
    name: 'strngr_messages_total',
    help: 'Total number of chat messages sent',
    labelNames: ['status'], // 'success', 'blocked'
    registers: [register],
  }),
  dbQueryDuration: new client.Histogram({
    name: 'strngr_db_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
  }),
  filterViolations: new client.Counter({
    name: 'strngr_filter_violations_total',
    help: 'Total number of profanity filter violations',
    registers: [register],
  }),
  dbQuerySlow: new client.Counter({
    name: 'strngr_db_slow_queries_total',
    help: 'Total number of slow database queries (>100ms)',
    labelNames: ['operation'],
    registers: [register],
  }),
  // New Business Metrics
  matchesTotal: new client.Counter({
    name: 'strngr_matches_total',
    help: 'Total number of successful matches',
    registers: [register],
  }),
  chatSessionDuration: new client.Histogram({
    name: 'strngr_chat_session_duration_seconds',
    help: 'Duration of chat sessions',
    buckets: [10, 30, 60, 120, 300, 600, 1800], // buckets up to 30 mins
    registers: [register],
  }),
  bansTotal: new client.Counter({
    name: 'strngr_bans_total',
    help: 'Total number of bans issued',
    labelNames: ['type'], // 'auto', 'manual'
    registers: [register],
  }),
  activeBanRate: new client.Gauge({
    name: 'strngr_active_ban_rate',
    help: 'Current percentage of active sessions that are banned',
    registers: [register],
  }),
  clientErrors: new client.Counter({
    name: 'strngr_client_errors_total',
    help: 'Total number of client-side errors reported',
    labelNames: ['type'],
    registers: [register],
  }),
  queueLength: new client.Gauge({
    name: 'strngr_queue_length',
    help: 'Number of users currently in the waiting queue',
    registers: [register],
  }),
  activeSessions: new client.Gauge({
    name: 'strngr_active_sessions',
    help: 'Number of active chat sessions (pairs)',
    registers: [register],
  }),
};

// --- DATABASE CACHE SETUP ---
const banCache = new LRUCache({
  max: 5000,
  ttl: 60 * 1000, // 60 seconds
});

const userCache = new LRUCache({
  max: 2000,
  ttl: 5 * 60 * 1000, // 5 minutes
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const isProd = process.env.NODE_ENV === 'production';

/**
 * Audit Logging for Admin Auth (Phase 2.2)
 */
function logAdminAuthEvent({ ok, ip, ua }) {
  try {
    const createdAt = Date.now();
    db.prepare('INSERT INTO admin_auth_log (ok, ip, ua, created_at) VALUES (?, ?, ?, ?)').run(
      ok ? 1 : 0,
      ip || null,
      ua || null,
      createdAt
    );
  } catch (e) {
    logger.warn({ message: 'admin-auth-log failed', error: e.message });
  }
}

// Founder can toggle this to immediately disable matchmaking
let MAINTENANCE_MODE = env.MAINTENANCE_MODE;
let MAINTENANCE_REASON = env.MAINTENANCE_REASON;

// Trust proxy for production environments (e.g. Heroku, AWS ELB, Nginx)
if (isProd && process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Validation Schemas
const Schemas = {
  message: z.string().trim().min(1).max(1000),
  typing: z.boolean(),
  report: z
    .object({
      reason: z.string().trim().min(1).max(500).optional(),
    })
    .optional(),
  appeal: z.object({
    reason: z.string().trim().min(5).max(1000),
  }),
  bannedWord: z.object({
    word: z.string().trim().min(1).max(50),
    severity: z.number().int().min(1).max(3),
    is_regex: z.boolean().optional(),
  }),
  violationSearch: z.number().int().min(0),
  pushSubscription: z.object({
    endpoint: z.string().url({ message: 'Invalid URL format' }),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  challengeResponse: z
    .string()
    .length(16)
    .regex(/^[a-f0-9]+$/),
  manualBan: z.object({
    ipHash: z.string().length(64),
    duration: z.number().int().min(1).max(365), // duration in days
    reason: z.string().min(1).max(200),
  }),
};

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.locals.nonce = crypto.randomBytes(32).toString('base64');

  // Request Logging & Metric Start
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    // Log request
    logger.info({
      message: 'Incoming Request',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      requestId: req.requestId,
      ip: req.ip,
    });

    // Record metric (skip static assets if possible to reduce noise, but keeping simple for now)
    if (req.route) {
      metrics.httpRequestDuration.observe(
        { method: req.method, route: req.route.path, status_code: res.statusCode },
        duration
      );
    }
  });

  next();
});

// Helper for HTTP IP Hash
const getIpHashFromReq = (req) => {
  const ip = req.ip || '0.0.0.0';
  return crypto.createHash('sha256').update(ip).digest('hex');
};

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
        'style-src': [
          "'self'",
          'https://fonts.googleapis.com',
          (req, res) => `'nonce-${res.locals.nonce}'`,
        ],
        'style-src-attr': ["'unsafe-inline'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https:',
          process.env.BASE_URL || 'https://strngr.chat',
        ],
        'connect-src': [
          "'self'",
          isProd ? 'wss:' : 'ws:',
          isProd ? 'https:' : 'http:',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
        ],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'upgrade-insecure-requests': isProd ? [] : null,
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'deny' },
    xContentTypeOptions: true,
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Gzip Compression
app.use(compression());

// Cookie Parser
app.use(cookieParser());

// Request Size Limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request Timeout Middleware
app.use((req, res, next) => {
  req.setTimeout(15000); // 15 seconds
  res.setTimeout(15000, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request Timeout' });
    }
  });
  next();
});

// Admin Session
// Update Session Config (Phase 2.3)
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : 0);

app.use(
  session({
    name: 'strngr.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 6, // 6 hours
    },
  })
);

// Standardized Error Handler Wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    logger.error('API Error', {
      method: req.method,
      url: req.originalUrl,
      requestId: req.requestId,
      error: err.message,
      stack: isProd ? undefined : err.stack,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', requestId: req.requestId });
    }
  });
};

// Maintenance Guard (Phase 4.1 - Upgraded)
function maintenanceGuard(req, res, next) {
  if (!MAINTENANCE_MODE) {
    return next();
  }

  // Allow admin & health checks
  if (
    req.path.startsWith('/admin') ||
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/maintenance') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/metrics')
  ) {
    return next();
  }

  // HTML requests → maintenance page
  if (req.accepts('html')) {
    const maintenanceFile = isProd
      ? path.join(__dirname, '../dist/maintenance.html')
      : path.join(__dirname, '../public/maintenance.html');

    if (fs.existsSync(maintenanceFile)) {
      return res.status(503).sendFile(maintenanceFile);
    }
  }

  return res.status(503).json({
    error: 'maintenance',
    message: 'Service temporarily unavailable',
  });
}

// Apply globally
app.use(maintenanceGuard);

function adminIpAllowList(req, res, next) {
  if (!process.env.ADMIN_ALLOWED_IPS) {
    return next();
  }

  const allowed = process.env.ADMIN_ALLOWED_IPS.split(',').map((ip) => ip.trim());
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const cleanIp = clientIp === '::1' ? '127.0.0.1' : clientIp.replace(/^::ffff:/, '');

  if (!allowed.includes(clientIp) && !allowed.includes(cleanIp)) {
    logAdminAuthEvent({ ok: false, ip: clientIp, ua: req.get('user-agent') });
    logger.warn(`Blocked admin login from disallowed IP: ${clientIp}`);
    return res.status(403).json({
      error: 'forbidden',
      message: 'Admin access restricted',
    });
  }

  next();
}

// Admin Middleware (Moved as per Phase 2.3)
const requireAdmin = (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Rate limiting for admin login (max 5 attempts per 15 minutes)
const adminLoginAttempts = new Map();

function adminRateLimit(ip, limit = 5, windowMs = 60_000) {
  const now = Date.now();
  const entry = adminLoginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    adminLoginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// Hardened Admin Login (Phase 3.3)
app.post('/api/admin/login', adminIpAllowList, (req, res) => {
  const ip = req.ip;
  const ua = req.get('user-agent') || 'unknown';

  if (!adminRateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many login attempts. Try again later.',
    });
  }

  const { password } = req.body || {};
  const valid = typeof password === 'string' && password === process.env.ADMIN_PASSWORD;

  logAdminAuthEvent({ ok: valid, ip, ua });

  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.regenerate(() => {
    req.session.isAdmin = true;
    res.json({ ok: true });
  });
});

// GeoBlocking Middleware
const checkGeoIP = (req, res, next) => {
  try {
    const highRisk = JSON.parse(process.env.HIGH_RISK_COUNTRIES);
    if (!Array.isArray(highRisk) || highRisk.length === 0) {
      return next();
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip) {
      const cleanIp = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
      const geo = geoip.lookup(cleanIp);
      if (geo && highRisk.includes(geo.country)) {
        if (!isProd) {
          logger.warn(`Blocked access from ${geo.country}: ${cleanIp}`);
        }
        return res.status(403).send('Access denied.');
      }
    }
  } catch (e) {
    logger.error('GeoIP Error:', { error: e.message });
  }
  next();
};
app.use(checkGeoIP);

// CSRF Protection (Stateless Double Submit Cookie)
app.use((req, res, next) => {
  // Exempt Socket.IO and Logging endpoints from CSRF
  if (
    req.path.startsWith('/socket.io/') ||
    req.path.startsWith('/api/logs/') ||
    req.path.startsWith('/api/stats')
  ) {
    return next();
  }

  const csrfToken = req.cookies['csrf_token'];
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

  if (isStateChanging && process.env.NODE_ENV !== 'test') {
    const headerToken = req.headers['x-csrf-token'];
    if (!csrfToken || !headerToken || headerToken !== csrfToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }

  // Rotate token on every request (or at least state-changing ones)
  // To keep it simple but more secure, we rotate it now.
  const newToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', newToken, {
    httpOnly: false, // Must be accessible for client to read and send back in header
    secure: isProd,
    sameSite: 'strict',
    path: '/',
  });

  next();
});

// Global Rate Limiting for Express routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 1000 : 2000, // Increased limit for production
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getIpHashFromReq(req),
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skip: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || '';
    return (
      process.env.NODE_ENV === 'test' ||
      !isProd ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.includes('127.0.0.1')
    );
  },
});
app.use(limiter);

// Static cache headers
const backgroundTasks = {
  intervals: [],
  cronJobs: [],
  timeouts: [],
};

const ONE_DAY = 1000 * 60 * 60 * 24;
const ONE_YEAR = ONE_DAY * 365;

// Initial file check
const indexHtmlPath = path.join(__dirname, '../dist/index.html');
if (isProd && !fs.existsSync(indexHtmlPath)) {
  console.error('FATAL: index.html not found in dist.');
  process.exit(1);
}

// API for landing page stats
app.get('/api/stats', (_req, res) => {
  res.json({ online: io.engine.clientsCount });
});

/**
 * Service Worker Asset Discovery
 * Reads Vite manifest to provide a dynamic list of assets to cache
 */
app.get('/api/assets', (_req, res) => {
  try {
    const manifestPath = path.join(__dirname, '../dist/.vite/manifest.json');
    const legacyPath = path.join(__dirname, '../dist/manifest.json');
    const targetPath = fs.existsSync(manifestPath) ? manifestPath : legacyPath;

    if (fs.existsSync(targetPath)) {
      const manifest = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      // Filter out files that are already listed or not needed for pre-caching
      const assets = Object.values(manifest)
        .filter((entry) => entry.file && !entry.file.endsWith('.html'))
        .map((entry) => `/${entry.file}`);
      res.json(assets);
    } else {
      res.json([]);
    }
  } catch {
    res.status(500).json({ error: 'Failed to read manifest' });
  }
});

app.get('/api/push/key', (_req, res) => {
  if (process.env.VAPID_PUBLIC_KEY) {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  } else {
    res.status(500).json({ error: 'Push not configured' });
  }
});
// --- OBSERVABILITY API ---

app.get('/metrics', async (req, res) => {
  // Basic Auth Protection for Metrics
  const credentials = auth(req);
  if (
    !credentials ||
    credentials.name !== 'admin' ||
    credentials.pass !== process.env.ADMIN_PASSWORD
  ) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Metrics Area"');
    return res.status(401).send('Access denied');
  }

  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.post('/api/logs/error', (req, res) => {
  const { type, message, stack, url, userAgent, timestamp } = req.body;

  logger.error({
    message: 'Client-Side Error',
    type,
    errorMessage: message,
    stack,
    url,
    userAgent,
    clientTimestamp: timestamp,
    ip: req.ip,
    requestId: req.requestId,
  });

  // Validate inputs to prevent log flooding/injection
  if (message && message.length > 5000) {
    return res.status(400).send('Message too long');
  }
  if (stack && stack.length > 10000) {
    return res.status(400).send('Stack too long');
  }

  metrics.clientErrors.inc({ type: type || 'unknown' });
  res.status(204).send();
});

app.post('/api/logs/perf', (req, res) => {
  const { name, value, id, delta } = req.body;

  logger.info({
    message: 'Client Performance Metric',
    metric: name,
    value,
    id,
    delta,
    userAgent: req.headers['user-agent'],
  });

  // Here we could update a histogram for Web Vitals if we wanted specific prometheus metrics for them
  res.status(204).send();
});

app.post('/api/feedback', (req, res) => {
  const { type, text, additionalData } = req.body;

  if (!text || text.length < 5) {
    return res.status(400).json({ error: 'Feedback too short' });
  }

  const ipHash = getIpHashFromReq(req);

  // Rate Limiting: Max 3 feedback submissions per hour
  // Note: RateLimiter is defined later but available at runtime
  if (
    typeof RateLimiter !== 'undefined' &&
    !RateLimiter.check(`${ipHash}_feedback`, 3, 60 * 60 * 1000)
  ) {
    return res.status(429).json({ error: 'Too many feedback submissions' });
  }

  try {
    // Sanitize feedback
    const safeText = sanitize(text);
    const safeData = JSON.stringify(additionalData || {});
    if (safeData.length > 2000) {
      return res.status(400).json({ error: 'Data too large' });
    }

    statements.createFeedback.run(ipHash, type || 'general', safeText, safeData, Date.now());
    res.json({ success: true });
  } catch (err) {
    logger.error('Error saving feedback', { error: err.message });
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

/**
 * Background Sync Endpoint for Failed Messages
 */
app.post(
  '/api/messages/send',
  asyncHandler(async (req, res) => {
    const { text, timestamp, socketId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const ipHash = getIpHashFromReq(req);

    logger.info({
      message: 'Background Sync Message Received',
      ipHash,
      socketId,
      timestamp,
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    });

    // In a real implementation, we would try to find the partner and deliver the message.
    // For now, we acknowledge receipt so the client can clear its sync queue.
    // We can also log it to a table for audit if needed.

    res.json({ success: true, message: 'Message received for sync' });
  })
);

// --- ALERTING RULES (Internal) ---
let recentErrorCount = 0;

// Update error counter in logging
const originalLoggerError = logger.error.bind(logger);
logger.error = (...args) => {
  recentErrorCount++;
  originalLoggerError(...args);
};

const errorMonitorJob = cron.schedule('* * * * *', async () => {
  // Alerting Rule: High Error Rate
  // If > 20 errors in the last minute
  if (recentErrorCount > 20) {
    logger.warn(`[ALERT] High Error Rate Detected: ${recentErrorCount} errors in the last minute.`);
    // In a real system, you would send an email or webhook here.
  }
  recentErrorCount = 0;

  // Example: Check DB connection health
  try {
    db.prepare('SELECT 1').get();
  } catch {
    logger.error('ALERT: Database connection failed!');
  }
});
backgroundTasks.cronJobs.push(errorMonitorJob);

// --- MODERATION API ---

// Public Status / Appeals
app.post(
  '/api/appeals',
  asyncHandler(async (req, res) => {
    const ipHash = getIpHashFromReq(req);
    const validation = Schemas.appeal.safeParse(req.body);

    if (!validation.success) {
      return res
        .status(400)
        .json({ error: 'Invalid appeal data', details: validation.error.errors });
    }

    const { reason } = validation.data;
    // Final sanitization before DB
    const sanitizedReason = sanitize(reason);

    try {
      await retryDatabaseOperation(
        () => statements.createAppeal.run(ipHash, sanitizedReason, Date.now()),
        'createAppeal'
      );
      res.json({ success: true, message: 'Appeal submitted successfully' });
    } catch (err) {
      logger.error('Appeal error:', { error: err.message });
      res.status(500).json({ error: 'Failed to submit appeal' });
    }
  })
);

app.get('/api/appeals/status', async (req, res) => {
  const ipHash = getIpHashFromReq(req);
  try {
    const status = statements.getAppealStatus.get(ipHash);
    res.json(status || { status: 'none' });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// --- EMERGENCY KILL SWITCH ENDPOINTS ---

// Get current maintenance status (public endpoint)
app.get('/api/maintenance/status', (_req, res) => {
  res.json({
    maintenance: MAINTENANCE_MODE,
    reason: MAINTENANCE_MODE ? MAINTENANCE_REASON : null,
    timestamp: Date.now(),
  });
});

// --- EMERGENCY KILL SWITCH ENDPOINTS (Phase 5.5) ---

// Admin toggle endpoint (Secured)
app.post(
  '/api/admin/maintenance',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const enabled = !!req.body?.enabled;
    const reason = req.body?.reason;

    MAINTENANCE_MODE = enabled;
    if (reason) {
      MAINTENANCE_REASON = reason;
    }

    logger.warn({
      message: `MAINTENANCE MODE ${enabled ? 'ENABLED' : 'DISABLED'}`,
      reason: MAINTENANCE_REASON,
      admin: req.session.isAdmin,
      timestamp: Date.now(),
    });

    if (enabled) {
      // Disconnect all
      io.emit('maintenance_mode', { reason: MAINTENANCE_REASON });
      setTimeout(() => io.disconnectSockets(true), 3000);
    }

    res.json({ ok: true, enabled: MAINTENANCE_MODE });
  })
);

// Legacy/Granular Endpoints (aliased for compatibility or specific actions)
app.get('/api/maintenance/status', (_req, res) => {
  res.json({
    maintenance: MAINTENANCE_MODE,
    reason: MAINTENANCE_MODE ? MAINTENANCE_REASON : null,
    timestamp: Date.now(),
  });
});

// Admin Endpoints (Protected)
app.get(
  '/api/moderation/stats',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    try {
      // Basic stats aggregation
      const violationStats = db.prepare('SELECT COUNT(*) as count FROM filter_violations').get();
      const banStats = db
        .prepare('SELECT COUNT(*) as count FROM user_moderation WHERE banned_until > ?')
        .get(Date.now());
      const appealStats = db
        .prepare("SELECT COUNT(*) as count FROM appeals WHERE status = 'pending'")
        .get();

      res.json({
        violations: violationStats.count,
        active_bans: banStats.count,
        pending_appeals: appealStats.count,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

app.get(
  '/api/moderation/logs',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    try {
      const logs = statements.getModerationLogs.all();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

app.get(
  '/api/moderation/export',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    try {
      const violations = db
        .prepare('SELECT message_text, violated_word FROM filter_violations LIMIT 10000')
        .all();
      // Export format for ML (text, label)
      const csv = violations
        .map((v) =>
          JSON.stringify({ text: v.message_text, label: 'violation', word: v.violated_word })
        )
        .join('\n');

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="moderation_data.jsonl"');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

// Serve HTML files with nonce injection

const serveHtmlWithNonce = (fileName) => {
  return (_req, res) => {
    const filePath = path.join(__dirname, '../dist', fileName);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const baseUrl = process.env.BASE_URL || 'https://strngr.chat';
      const html = content
        .replace(/__NONCE__/g, res.locals.nonce)
        .replace(/{{BASE_URL}}/g, baseUrl);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.send(html);
    } catch {
      res
        .status(404)
        .setHeader('Content-Type', 'text/html')
        .send(
          `
        <html>
          <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h1>404</h1>
              <p>Page not found</p>
              <a href="/">Go Home</a>
            </div>
          </body>
        </html>
      `.replace(/__NONCE_PLACEHOLDER__/g, res.locals.nonce)
        );
    }
  };
};

app.get('/', serveHtmlWithNonce('index.html'));
app.get('/admin.html', serveHtmlWithNonce('admin.html'));
app.get('/terms.html', serveHtmlWithNonce('terms.html'));
app.get('/privacy.html', serveHtmlWithNonce('privacy.html'));
app.get('/offline.html', serveHtmlWithNonce('offline.html'));

// Serving static files in production or test
const useProdCaching = isProd || process.env.NODE_ENV === 'test';
app.use(
  express.static(path.join(__dirname, '../dist'), {
    maxAge: useProdCaching ? ONE_YEAR : 0,
    immutable: useProdCaching,
    index: false, // Disable default index serving to allow our dynamic route to handle '/'
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        // HTML files should always be revalidated
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    },
  })
);

// requireAdmin moved up

// Remove separate json parsing as it's added above with limits
// app.use(express.json());

const dbPath = path.join(__dirname, 'db');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

let db;
let statements = {};
let isReconnecting = false;

const prepareStatements = () => {
  if (!db) {
    return;
  }
  try {
    statements.checkBan = db.prepare('SELECT banned_until FROM user_moderation WHERE ip_hash = ?');
    statements.upsertReport = db.prepare(`
      INSERT INTO user_moderation (ip_hash, reports, last_report_at)
      VALUES (?, 1, ?)
      ON CONFLICT(ip_hash) DO UPDATE SET 
        reports = reports + 1,
        last_report_at = excluded.last_report_at
    `);

    statements.getBannedWords = db.prepare(
      'SELECT word, severity, is_regex FROM banned_words WHERE enabled = 1'
    );
    statements.recordViolation = db.prepare(
      'INSERT INTO filter_violations (ip_hash, violated_word, message_text, created_at) VALUES (?, ?, ?, ?)'
    );
    statements.countViolations = db.prepare(
      'SELECT COUNT(*) as count FROM filter_violations WHERE ip_hash = ? AND created_at > ?'
    );
    statements.cleanupOldViolations = db.prepare(
      'DELETE FROM filter_violations WHERE created_at < ?'
    );
    statements.checkUserModeration = db.prepare(
      'SELECT reputation_score FROM user_moderation WHERE ip_hash = ?'
    );
    statements.banUser = db.prepare(
      'UPDATE user_moderation SET banned_until = ? WHERE ip_hash = ?'
    );
    statements.insertUserBan = db.prepare(
      'INSERT INTO user_moderation (ip_hash, reports, banned_until, reputation_score) VALUES (?, 0, ?, ?)'
    );
    statements.updateReputation = db.prepare(
      'UPDATE user_moderation SET reputation_score = ? WHERE ip_hash = ?'
    );

    statements.invalidateUserCache = (ipHash) => {
      banCache.delete(ipHash);
      userCache.delete(ipHash);
    };

    statements.upsertBan = db.prepare(`
      INSERT INTO user_moderation (ip_hash, reports, banned_until)
      VALUES (?, 0, ?)
      ON CONFLICT(ip_hash) DO UPDATE SET banned_until = excluded.banned_until
    `);

    // Whitelist & Config
    statements.getWhitelistedPhrases = db.prepare('SELECT phrase FROM whitelisted_phrases');
    statements.getConfig = db.prepare('SELECT key, value FROM system_config');
    statements.setConfig = db.prepare(
      'INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)'
    );

    // Appeals
    statements.createAppeal = db.prepare(
      "INSERT INTO appeals (ip_hash, reason, status, created_at) VALUES (?, ?, 'pending', ?)"
    );
    statements.getAppealStatus = db.prepare(
      'SELECT status, reason, created_at FROM appeals WHERE ip_hash = ? ORDER BY created_at DESC LIMIT 1'
    );
    statements.getAllAppeals = db.prepare(
      'SELECT * FROM appeals ORDER BY created_at DESC LIMIT 100'
    );

    // Logging
    statements.logModeration = db.prepare(
      'INSERT INTO moderation_logs (action, target_ip_hash, details, performed_by, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    statements.getModerationLogs = db.prepare(
      'SELECT * FROM moderation_logs ORDER BY created_at DESC LIMIT 100'
    );

    statements.createFeedback = db.prepare(
      'INSERT INTO user_feedback (ip_hash, type, text, additional_data, created_at) VALUES (?, ?, ?, ?, ?)'
    );

    statements.createFlaggedMessage = db.prepare(
      'INSERT INTO flagged_messages (ip_hash, message_text, reason, toxicity_score, created_at) VALUES (?, ?, ?, ?, ?)'
    );

    statements.getFlaggedMessages = db.prepare(
      "SELECT * FROM flagged_messages WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100"
    );

    statements.updateFlaggedMessageStatus = db.prepare(
      'UPDATE flagged_messages SET status = ? WHERE id = ?'
    );

    statements.getAllBannedRanges = db.prepare('SELECT * FROM banned_ranges');
    statements.addBannedRange = db.prepare(
      'INSERT INTO banned_ranges (cidr, reason, added_by, created_at) VALUES (?, ?, ?, ?)'
    );

    logger.info('✓ Prepared statements initialized');
  } catch (err) {
    logger.error('Failed to prepare statements', { error: err.message });
  }
};
const initializationState = {
  connection: false,
  tables: {},
  indexes: false,
  seeding: false,
  statements: false,
};

export { initializationState }; // Export for health checks

const initDatabase = () => {
  try {
    db = new Database(path.join(dbPath, process.env.DB_NAME));
    // Connection pooling/concurrency configuration
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('mmap_size = 268435456'); // 256MB mmap
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    initializationState.connection = true;
    logger.info('✓ Database connection established');
    return true;
  } catch (err) {
    logger.error('Failed to create database connection:', {
      error: err.message,
      path: dbPath,
      hint: 'Check disk space and file permissions',
    });
    return false;
  }
};

if (!initDatabase()) {
  console.error('[FATAL] Database connection failed. See logs for details.');
  process.exit(1);
}

// Database initialization with granular error handling
const createTable = (name, sql) => {
  try {
    db.prepare(sql).run();
    initializationState.tables[name] = true;
  } catch (err) {
    logger.error(`Failed to create table ${name}:`, { error: err.message });
    initializationState.tables[name] = false;
    // Critical tables
    if (['user_moderation', 'banned_words', 'filter_violations'].includes(name)) {
      console.error(`[FATAL] Critical table ${name} could not be created.`);
      process.exit(1);
    }
  }
};

try {
  // User moderation table (Enhanced with reputation)
  createTable(
    'user_moderation',
    `
        CREATE TABLE IF NOT EXISTS user_moderation (
            ip_hash TEXT PRIMARY KEY,
            reports INTEGER DEFAULT 0,
            banned_until INTEGER DEFAULT NULL,
            last_report_at INTEGER,
            reputation_score INTEGER DEFAULT 100
        )
    `
  );

  // Migration: Add reputation_score if missing
  try {
    db.prepare('ALTER TABLE user_moderation ADD COLUMN reputation_score INTEGER DEFAULT 100').run();
  } catch {
    /* reputation_score already exists */
  }

  // Banned words table (Enhanced with regex)
  createTable(
    'banned_words',
    `
        CREATE TABLE IF NOT EXISTS banned_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL UNIQUE,
            severity INTEGER DEFAULT 1,
            is_regex INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            enabled INTEGER DEFAULT 1
        )
    `
  );

  // Migration: Add is_regex if missing
  try {
    db.prepare('ALTER TABLE banned_words ADD COLUMN is_regex INTEGER DEFAULT 0').run();
  } catch {
    /* is_regex already exists */
  }

  // Whitelisted phrases
  createTable(
    'whitelisted_phrases',
    `
        CREATE TABLE IF NOT EXISTS whitelisted_phrases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phrase TEXT NOT NULL UNIQUE,
            created_at INTEGER NOT NULL
        )
    `
  );

  // Appeals table
  createTable(
    'appeals',
    `
        CREATE TABLE IF NOT EXISTS appeals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_hash TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending', -- pending, approved, rejected
            created_at INTEGER NOT NULL,
            reviewed_at INTEGER,
            reviewed_by TEXT
        )
    `
  );

  // Moderation Logs
  createTable(
    'moderation_logs',
    `
        CREATE TABLE IF NOT EXISTS moderation_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            target_ip_hash TEXT,
            details TEXT,
            performed_by TEXT,
            created_at INTEGER NOT NULL
        )
    `
  );

  // Admin Auth Log (Hardening 3.2)
  createTable(
    'admin_auth_log',
    `
        CREATE TABLE IF NOT EXISTS admin_auth_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ok INTEGER NOT NULL, -- 0 or 1
          ip TEXT,
          ua TEXT,
          created_at INTEGER NOT NULL
        );
    `
  );

  // System Config
  createTable(
    'system_config',
    `
        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `
  );

  // User Feedback
  createTable(
    'user_feedback',
    `
        CREATE TABLE IF NOT EXISTS user_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_hash TEXT NOT NULL,
            type TEXT DEFAULT 'general',
            text TEXT,
            additional_data TEXT,
            created_at INTEGER NOT NULL
        )
    `
  );

  // Flagged Messages (Moderation Queue)
  createTable(
    'flagged_messages',
    `
        CREATE TABLE IF NOT EXISTS flagged_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_hash TEXT NOT NULL,
            message_text TEXT,
            reason TEXT,
            toxicity_score REAL,
            status TEXT DEFAULT 'pending', -- pending, approved, rejected
            created_at INTEGER NOT NULL
        )
    `
  );

  // Banned IP Ranges (CIDR)
  createTable(
    'banned_ranges',
    `
        CREATE TABLE IF NOT EXISTS banned_ranges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cidr TEXT NOT NULL UNIQUE,
            reason TEXT,
            added_by TEXT,
            created_at INTEGER NOT NULL
        )
    `
  );

  // Indexes
  try {
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_admin_auth_log_created_at ON admin_auth_log(created_at)'
    ).run();
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_filter_violations_ip_time ON filter_violations(ip_hash, created_at)'
    ).run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_appeals_ip ON appeals(ip_hash)').run();
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_user_mod_banned ON user_moderation(banned_until)'
    ).run();
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_banned_words_enabled ON banned_words(enabled)'
    ).run();
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_filter_violations_created_at ON filter_violations(created_at)'
    ).run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_user_mod_ip_hash ON user_moderation(ip_hash)').run();
    db.prepare('ANALYZE').run();
    initializationState.indexes = true;
  } catch (err) {
    logger.warn('Failed to create some indexes', { error: err.message });
  }

  // Seed banned words if table is empty
  try {
    const wordCount = db.prepare('SELECT COUNT(*) as count FROM banned_words').get();
    if (wordCount.count === 0) {
      const initialWords = [
        { word: 'spamlink.com', severity: 3, is_regex: 0 },
        { word: 'badword1', severity: 2, is_regex: 0 },
      ];
      const insertWord = db.prepare(`
              INSERT INTO banned_words (word, severity, is_regex, created_at, enabled) 
              VALUES (?, ?, ?, ?, 1)
          `);
      const now = Date.now();
      for (const { word, severity, is_regex } of initialWords) {
        insertWord.run(word, severity, is_regex, now);
      }
      logger.info(`✓ Seeded ${initialWords.length} banned words`);
    }
    initializationState.seeding = true;
  } catch (err) {
    logger.warn('Failed to seed database', { error: err.message });
  }

  logger.info('✓ SQLite moderation DB initialized');

  // Statement Preparation
  try {
    prepareStatements();
    if (Object.keys(statements).length === 0) {
      throw new Error('No statements prepared');
    }
    initializationState.statements = true;
  } catch (err) {
    logger.error('Failed to prepare statements', { error: err.message });
    // Retry once
    try {
      prepareStatements();
      initializationState.statements = true;
    } catch (retryErr) {
      console.error('[FATAL] Statement preparation failed permanently.');
      process.exit(1);
    }
  }
} catch (err) {
  console.error('[FATAL] Database initialization failed:', err);
  process.exit(1);
}

/**
 * Database Health Check with Retry Logic
 */
const checkDatabaseHealth = () => {
  try {
    if (!db) {
      return false;
    }
    db.prepare('SELECT 1').get();
    return true;
  } catch (err) {
    logger.error('[DB Health Check] Database connection failed:', { error: err.message });
    return false;
  }
};

const retryDatabaseOperation = async (
  operation,
  label = 'unknown',
  maxRetries = 3,
  delay = 100
) => {
  const startTime = Date.now();
  const end = metrics.dbQueryDuration.startTimer({ operation: label });
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      end();

      if (duration > 100) {
        logger.warn({
          message: 'Slow Database Query',
          operation: label,
          duration: `${duration}ms`,
          attempt,
        });
        metrics.dbQuerySlow.inc({ operation: label });
      }

      return result;
    } catch (err) {
      // Handle connection loss/corruption
      if (
        err.message.includes('database connection is not open') ||
        err.message.includes('readonly')
      ) {
        logger.warn(`Database connection issue detected for ${label}. Attempting recovery...`);
        initDatabase(); // Try to reconnect
        // Re-prepare statements might be needed if they were closed
        try {
          if (typeof prepareStatements === 'function') {
            prepareStatements();
          }
        } catch (e) {
          logger.error('Failed to re-prepare statements during recovery', { error: e.message });
        }
      }

      if (attempt === maxRetries) {
        end();
        logger.error(`Database Operation Failed after ${maxRetries} attempts: ${label}`, {
          error: err.message,
        });
        throw err;
      }

      // Retry on busy or locked
      if (
        err.code === 'SQLITE_BUSY' ||
        err.code === 'SQLITE_LOCKED' ||
        err.message.includes('locked')
      ) {
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      end();
      throw err;
    }
  }
};

// Periodic health check every 5 minutes
// Periodic health check every 5 minutes
if (process.env.NODE_ENV !== 'test') {
  const healthCheckInterval = setInterval(
    async () => {
      if (isReconnecting) {
        return;
      }

      if (!checkDatabaseHealth()) {
        logger.error('[DB Health Check] Database is unhealthy. Attempting recovery...');
        isReconnecting = true;
        try {
          // Proper cleanup before reconnecting
          if (db) {
            try {
              db.close();
              logger.info('[DB Health Check] Closed old database connection');
            } catch (closeErr) {
              logger.error('[DB Health Check] Error closing old connection:', {
                error: closeErr.message,
              });
            }
          }

          // Try to reconnect
          db = new Database(path.join(dbPath, process.env.DB_NAME));
          db.pragma('journal_mode = WAL');
          prepareStatements();
          initializationState.connection = true;
          logger.info('[DB Health Check] Database reconnected successfully');
        } catch (err) {
          logger.error('[DB Health Check] Failed to reconnect to database:', {
            error: err.message,
          });
        } finally {
          isReconnecting = false;
        }
      }
    },
    5 * 60 * 1000
  );
  backgroundTasks.intervals.push(healthCheckInterval);
}

/**
 * DATABASE BACKUP MECHANISM
 * Creates daily backups and maintains last 7 backups
 */
const backupDatabase = async () => {
  try {
    const backupDir = path.join(dbPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(backupDir, `moderation_${timestamp}.db`);

    // Use SQLite backup API for safe backup
    await retryDatabaseOperation(async () => {
      await db.backup(backupPath);
    }, 'databaseBackup');

    logger.info(`Database backup created: ${backupPath}`);

    // Cleanup old backups (keep last 7)
    const backupFiles = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('moderation_') && f.endsWith('.db'))
      .map((f) => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    // Remove backups beyond the 7 most recent
    for (let i = 7; i < backupFiles.length; i++) {
      fs.unlinkSync(backupFiles[i].path);
      logger.info(`Removed old backup: ${backupFiles[i].name}`);
    }
  } catch (err) {
    logger.error('Database backup failed:', err.message);
  }
};

/**
 * DATABASE CLEANUP
 * Removes old filter violations (> 30 days)
 */
const cleanupOldRecords = async () => {
  try {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const result = await retryDatabaseOperation(() => {
      return statements.cleanupOldViolations.run(thirtyDaysAgo);
    }, 'cleanupOldViolations');

    if (result.changes > 0) {
      logger.info(`Cleaned up ${result.changes} old filter violations`);
    }

    // Run VACUUM to reclaim space (only if significant deletions)
    if (result.changes > 100) {
      await retryDatabaseOperation(() => {
        db.prepare('VACUUM').run();
      }, 'vacuum');
      logger.info('Database VACUUM completed');
    }
  } catch (err) {
    logger.error('Database cleanup failed:', err.message);
  }
};

/**
 * DATABASE SIZE MONITORING
 * Logs database size and warns if it exceeds thresholds
 */
const monitorDatabaseSize = async () => {
  try {
    const dbFilePath = path.join(dbPath, process.env.DB_NAME);
    const stats = fs.statSync(dbFilePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    logger.info(`Database size: ${sizeMB} MB`);

    // Warn if database exceeds 500MB
    if (stats.size > 500 * 1024 * 1024) {
      logger.warn(`Database size (${sizeMB} MB) exceeds 500MB threshold. Consider cleanup.`);
    }

    // Get table sizes
    const tableStats = db
      .prepare(
        `
      SELECT name, 
             (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as count
      FROM sqlite_master m WHERE type='table'
    `
      )
      .all();

    logger.info('Table statistics:', tableStats);
  } catch (err) {
    logger.error('Database size monitoring failed:', err.message);
  }
};

if (process.env.NODE_ENV !== 'test') {
  // Schedule daily backup at 2 AM
  const backupJob = cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled database backup...');
    await backupDatabase();
  });
  backgroundTasks.cronJobs.push(backupJob);

  // Schedule daily cleanup at 3 AM
  const cleanupJob = cron.schedule('0 3 * * *', async () => {
    logger.info('Starting scheduled database cleanup...');
    await cleanupOldRecords();
  });
  backgroundTasks.cronJobs.push(cleanupJob);

  // Schedule size monitoring every 6 hours
  const monitorJob = cron.schedule('0 */6 * * *', async () => {
    await monitorDatabaseSize();
  });
  backgroundTasks.cronJobs.push(monitorJob);
}

// Run initial monitoring on startup (after a delay)
if (process.env.NODE_ENV !== 'test') {
  setTimeout(async () => {
    await monitorDatabaseSize();
  }, 10000);
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Explicitly support both
  allowUpgrades: true,
  maxHttpBufferSize: 1e4, // 10KB - Hardened transport-level limit (Gap #2)
  pingInterval: 25000, // Heartbeat: Send ping every 25s
  pingTimeout: 20000, // Heartbeat: Close connection if pong not received within 20s
});

/**
 * CONFIGURATION & CONSTRAINTS
 */
const CONSTRAINTS = {
  MSG_MAX_LENGTH: 1000,
  MSG_RATE_LIMIT_MS: 500,
  REQUEUE_COOLDOWN_MS: 2000,
  REPORT_THRESHOLD: 5,
  TEMP_BAN_DURATION: 1000 * 60 * 60 * 24, // 24 hours
  BAN_DURATION_HIGH: 1000 * 60 * 60 * 24 * 7, // 7 days
  BAN_DURATION_MEDIUM: 1000 * 60 * 60 * 24, // 24 hours
  REPORT_RATE_LIMIT: 5, // Max reports per session
  REPORT_RATE_WINDOW: 60 * 60 * 1000, // 1 hour
  CONN_RATE_LIMIT: 10, // Max 10 connections per window
  CONN_RATE_WINDOW_MS: 60 * 1000, // 1 minute
  FILTER_VIOLATION_THRESHOLD: 3, // Auto-ban after 3 filter violations
  FILTER_VIOLATION_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  CHALLENGE_TIMEOUT: 15000, // 15 seconds to solve challenge (increased for PoW)
  TYPING_TIMEOUT: 3000, // 3 seconds typing indicator
  POW_COMPLEXITY: 3, // Hex characters (000 = 12 bits)
};

const TIMEOUTS = {
  SHUTDOWN_TIMEOUT: 30000,
  MATCH_LOCK_TIMEOUT: 10000,
};

const _LIMITS = {
  MAX_MESSAGE_HISTORY: 50,
  ADMIN_PAGINATION_DEFAULT: 50,
};

// Load dynamic config
const loadSystemConfig = async () => {
  try {
    const rows = await retryDatabaseOperation(() => statements.getConfig.all(), 'getConfig');
    rows.forEach((row) => {
      // Attempt to parse number, otherwise keep string
      const num = Number(row.value);
      CONSTRAINTS[row.key] = isNaN(num) ? row.value : num;
    });
    if (!isProd) {
      logger.info('✓ Loaded system config from DB');
    }
  } catch {
    logger.warn('Failed to load system config, using defaults');
  }
};

// Cache warming
const warmBannedWordsCache = async () => {
  try {
    const words = statements.getBannedWords.all();
    // Assuming loadBannedWords uses statements.getBannedWords
    // If not, we just call the helper that populates the cache
    logger.info(`✓ Banned words cache warmed: ${words.length} items`);
  } catch (e) {
    logger.error('Failed to warm cache:', e);
  }
};

// Run config load and cache warm on startup
if (process.env.NODE_ENV !== 'test') {
  setTimeout(async () => {
    await loadSystemConfig();
    await warmBannedWordsCache();
  }, 1000);
}

/**
 * STATE MANAGEMENT
 */
// { state, partnerId, roomId, lastMsgAt, lastMatchAt, ipHash, reportsSent, isVerified, challengeTimeout }
const socketStates = new Map();
const connectionRates = new Map(); // ipHash -> { count, windowStart }
const matchLock = new Map(); // socketId -> boolean
let waitingQueue = []; // Array of socket IDs
// isProd already defined above

/**
 * UTILS
 */
/**
 * Generates a SHA-256 hash of a socket's IP address
 * @param {import('socket.io').Socket} socket - Socket.IO socket object
 * @returns {string} SHA-256 hash of the IP
 */
const getIpHash = (socket) => {
  // Check various headers for behind-proxy IPs (adjust based on deployment)
  const ip =
    socket.handshake.headers['x-forwarded-for'] ||
    socket.handshake.address ||
    socket.request.connection.remoteAddress;
  return crypto.createHash('sha256').update(ip).digest('hex');
};

/**
 * Sanitizes user input by escaping HTML and limiting length
 * @param {string} text - Raw user input
 * @returns {string} Sanitized text safe for display
 */
const sanitize = (text) => {
  if (typeof text !== 'string') {
    return '';
  }
  return text
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;')
    .substring(0, CONSTRAINTS.MSG_MAX_LENGTH);
};

const transitionState = (socketId, newState, metadata = {}) => {
  const session = socketStates.get(socketId);
  if (!session) {
    return;
  }

  const currentState = session.state;
  const allowed = {
    challenging: ['idle'],
    idle: ['waiting', 'idle'],
    waiting: ['chatting', 'idle', 'waiting'],
    chatting: ['idle', 'waiting', 'chatting'],
  };

  if (!allowed[currentState] || !allowed[currentState].includes(newState)) {
    if (!isProd) {
      console.warn(
        `Blocked invalid state transition: ${currentState} -> ${newState} for ${socketId}`
      );
    }
    return;
  }

  socketStates.set(socketId, { ...session, state: newState, ...metadata });
};

/**
 * Robust Rate Limiter for Sockets
 */
const RateLimiter = {
  check: (key, limit, windowMs) => {
    const now = Date.now();
    const bucket = connectionRates.get(key) || { count: 0, windowStart: now };

    if (now - bucket.windowStart > windowMs) {
      bucket.count = 1;
      bucket.windowStart = now;
    } else {
      bucket.count++;
    }

    connectionRates.set(key, bucket);
    return bucket.count <= limit;
  },

  clear: (key) => {
    connectionRates.delete(key);
  },
};

/**
 * Persitence Helpers
 */
const isUserBanned = async (ipHash) => {
  // 1. Check LRU cache first
  const cachedStatus = banCache.get(ipHash);
  if (cachedStatus !== undefined) {
    return cachedStatus;
  }

  try {
    const isBanned = await retryDatabaseOperation(() => {
      const row = statements.checkBan.get(ipHash);
      if (!row || !row.banned_until) {
        return false;
      }
      return Date.now() < row.banned_until;
    }, 'checkBan');

    // 2. Store in cache
    banCache.set(ipHash, isBanned);
    return isBanned;
  } catch (err) {
    logger.error('Failed to check ban status', {
      ipHash: ipHash.substring(0, 8),
      error: err.message,
    });
    return false;
  }
};

const reportUser = async (ipHash) => {
  const now = Date.now();
  try {
    await retryDatabaseOperation(() => {
      statements.upsertReport.run(ipHash, now);

      // Auto-ban check after reporting
      const row = db.prepare('SELECT reports FROM user_moderation WHERE ip_hash = ?').get(ipHash);
      if (row && row.reports >= CONSTRAINTS.REPORT_THRESHOLD) {
        const bannedUntil = now + CONSTRAINTS.TEMP_BAN_DURATION;
        statements.upsertBan.run(ipHash, bannedUntil); // Removed redundant bannedUntil argument
        statements.invalidateUserCache(ipHash);

        logger.warn('User auto-banned after reports', {
          ipHash: ipHash.substring(0, 8),
          reports: row.reports,
        });
      }
    }, 'reportUser');
  } catch (err) {
    logger.error('Failed to report user', { ipHash: ipHash.substring(0, 8), error: err.message });
  }
};

/**
 * BATCH PROCESSING FOR FILTER VIOLATIONS
 * Reduces database write operations by batching inserts every 5 seconds
 */
let violationBatchQueue = [];
const BATCH_INTERVAL_MS = 5000; // 5 seconds

const flushViolationBatch = async () => {
  if (violationBatchQueue.length === 0) {
    return;
  }

  const batch = [...violationBatchQueue];
  violationBatchQueue = [];

  try {
    await retryDatabaseOperation(() => {
      const insertMany = db.transaction((violations) => {
        for (const { ipHash, violatedWord, messageText, timestamp } of violations) {
          statements.recordViolation.run(ipHash, violatedWord, messageText, timestamp);
        }
      });
      insertMany(batch);
    }, 'batchInsertViolations');

    logger.info(`Flushed ${batch.length} filter violations to database`);
  } catch (err) {
    logger.error('Failed to flush violation batch:', err.message);
    // Re-queue failed items
    violationBatchQueue.unshift(...batch);
  }
};

// Batch flush interval
if (process.env.NODE_ENV !== 'test') {
  const flushInterval = setInterval(flushViolationBatch, BATCH_INTERVAL_MS);
  backgroundTasks.intervals.push(flushInterval);
}

/**
 * FILTER RULES MANAGEMENT
 * Handles loading and caching of banned words and whitelisted phrases.
 */
let bannedWordsCache = [];
let whitelistedPhrasesCache = [];
let bannedWordsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const loadFilterRules = async () => {
  const now = Date.now();
  if (bannedWordsCache.length > 0 && now - bannedWordsCacheTime < CACHE_TTL) {
    return { bannedWords: bannedWordsCache, whitelistedPhrases: whitelistedPhrasesCache };
  }

  try {
    // Load banned words
    const words = await retryDatabaseOperation(
      () => statements.getBannedWords.all(),
      'getBannedWords'
    );
    bannedWordsCache = words.map((row) => {
      let compiledRegex = null;
      if (row.is_regex) {
        try {
          compiledRegex = new RegExp(row.word, 'i');
        } catch (e) {
          logger.warn(`Invalid regex for banned word ${row.word}: ${e.message}`);
        }
      }
      return {
        word: row.word, // preserve case for regex, lowercase for string
        severity: row.severity || 1,
        is_regex: !!row.is_regex,
        regex: compiledRegex,
      };
    });

    // Load whitelist
    const phrases = await retryDatabaseOperation(
      () => statements.getWhitelistedPhrases.all(),
      'getWhitelistedPhrases'
    );
    whitelistedPhrasesCache = phrases.map((p) => p.phrase.toLowerCase());

    bannedWordsCacheTime = now;
    return { bannedWords: bannedWordsCache, whitelistedPhrases: whitelistedPhrasesCache };
  } catch (err) {
    logger.error('[DB Error] Failed to load filter rules:', { error: err.message });
    return { bannedWords: bannedWordsCache, whitelistedPhrases: whitelistedPhrasesCache };
  }
};

/**
 * Check message against banned words filter
 * Returns { blocked: boolean, word: string|null, severity: number }
 */
/**
 * Check message against banned words filter
 * Returns { blocked: boolean, word: string|null, severity: number }
 */
/* Helper: Check CIDR Match */
const isIpInCidr = (ip, cidr) => {
  try {
    const [range, bits = 32] = cidr.split('/');
    const mask = ~(2 ** (32 - bits) - 1);
    const ipLong = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const rangeLong =
      range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    return (ipLong & mask) === (rangeLong & mask);
  } catch {
    return false;
  }
};

/* Helper: Check if IP is banned via Range */
const isIpRangeBanned = async (ip) => {
  try {
    const ranges = await retryDatabaseOperation(
      () => statements.getAllBannedRanges.all(),
      'getAllBannedRanges'
    );
    for (const range of ranges) {
      if (isIpInCidr(ip, range.cidr)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

const perspectiveCircuitBreaker = {
  failures: 0,
  lastFailure: 0,
  state: 'closed', // closed, open, half-open
  MAX_FAILURES: 5,
  RESET_TIMEOUT: 60000, // 1 minute
};

/* Helper: Check Toxicity with Perspective API */
const checkToxicity = async (text) => {
  if (!process.env.PERSPECTIVE_API_KEY) {
    return { toxic: false, score: 0 };
  }

  // Circuit Breaker Check
  if (perspectiveCircuitBreaker.state === 'open') {
    if (
      Date.now() - perspectiveCircuitBreaker.lastFailure >
      perspectiveCircuitBreaker.RESET_TIMEOUT
    ) {
      perspectiveCircuitBreaker.state = 'half-open';
      logger.info('Perspective API Circuit Breaker: Half-Open (attempting recovery)');
    } else {
      return { toxic: false, score: 0, breaker: true };
    }
  }

  try {
    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text },
          languages: ['en'],
          requestedAttributes: { TOXICITY: {} },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Perspective API returned ${response.status}`);
    }

    const data = await response.json();
    const score = data.attributeScores.TOXICITY.summaryScore.value;

    // Reset circuit on success
    if (perspectiveCircuitBreaker.state !== 'closed') {
      logger.info('Perspective API Circuit Breaker: Closed (recovered)');
      perspectiveCircuitBreaker.state = 'closed';
      perspectiveCircuitBreaker.failures = 0;
    }

    return { toxic: score > 0.8, score };
  } catch (e) {
    perspectiveCircuitBreaker.failures++;
    perspectiveCircuitBreaker.lastFailure = Date.now();

    if (perspectiveCircuitBreaker.failures >= perspectiveCircuitBreaker.MAX_FAILURES) {
      if (perspectiveCircuitBreaker.state !== 'open') {
        logger.error('Perspective API Circuit Breaker: OPEN (too many failures)');
        perspectiveCircuitBreaker.state = 'open';
      }
    }

    logger.error('Perspective API Error:', {
      error: e.message,
      failures: perspectiveCircuitBreaker.failures,
      state: perspectiveCircuitBreaker.state,
    });
    return { toxic: false, score: 0 };
  }
};

/* Helper: Check for Links */
const containsLink = (text) => {
  const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}\/)/i;
  return linkRegex.test(text);
};

const checkMessageAgainstFilter = async (text, ipHash = null) => {
  // Reputation Check: Whitelist trusted users (score > 90)
  if (ipHash) {
    let repScore = userCache.get(ipHash);
    if (repScore === undefined) {
      try {
        const user = statements.checkUserModeration.get(ipHash);
        repScore = user ? user.reputation_score : 100;
        userCache.set(ipHash, repScore);
      } catch {
        repScore = 100;
      }
    }
    if (repScore > 90) {
      return { blocked: false, word: null, severity: 0 };
    }
  }

  // 1. Link Detection
  if (containsLink(text)) {
    return { blocked: true, word: '[LINK]', severity: 2 };
  }

  // 2. ML Toxicity Check (Async)
  if (text.length > 5) {
    const { toxic, score } = await checkToxicity(text);
    if (toxic) {
      return { blocked: true, word: '[TOXIC]', severity: 2, score };
    }
    // Flag for review if borderline (0.6 - 0.8)
    if (score > 0.6 && ipHash) {
      try {
        statements.createFlaggedMessage.run(ipHash, text, 'Borderline Toxicity', score, Date.now());
      } catch {
        /* ignore error */
      }
    }
  }

  const { bannedWords, whitelistedPhrases } = await loadFilterRules();
  const lowerText = text.toLowerCase();

  // 1. Check Whitelist (if message contains a whitelisted phrase that strictly equals the message or is significant)
  // For now, if any whitelisted phrase is found, we might want to be careful.
  // Current Rule: If a banned word is found, check if it's "safe" due to whitelist.

  // We'll iterate banned words first.
  let matchedBan = null;

  for (const { word, severity, is_regex, regex } of bannedWords) {
    let isMatch = false;

    if (is_regex && regex) {
      // Use precompiled regex
      if (regex.test(text)) {
        isMatch = true;
      }
    } else {
      if (lowerText.includes(word.toLowerCase())) {
        isMatch = true;
      }
    }

    if (isMatch) {
      matchedBan = { word, severity };
      break; // Stop at first match found
    }
  }

  if (!matchedBan) {
    return { blocked: false, word: null, severity: 0 };
  }

  // 2. If matched, check if it's covered by a whitelist phrase
  // Logic: If the matched text is part of a whitelisted phrase.
  // This is hard to perfect without knowing exact indices.
  // Enhanced Whitelist Logic: If the message *contains* a whitelisted phrase,
  // and that whitelisted phrase *contains* the banned word (string match), we ignore it.

  for (const phrase of whitelistedPhrases) {
    if (lowerText.includes(phrase)) {
      // The message contains a safe phrase.
      // Does this safe phrase contain the banned word?
      // e.g. Banned: "ass", Whitelist: "grass", Msg: "Touching grass"
      // Banned match found. Whitelist match found ("grass"). "grass" includes "ass". -> Ignored.
      if (phrase.includes(matchedBan.word.toLowerCase())) {
        return { blocked: false, word: null, severity: 0 };
      }
    }
  }

  return { blocked: true, word: matchedBan.word, severity: matchedBan.severity };
};

/**
 * Record a filter violation for a user (batched)
 */
const recordFilterViolation = async (ipHash, violatedWord, messageText) => {
  const now = Date.now();

  // Add to batch queue instead of immediate insert
  violationBatchQueue.push({
    ipHash,
    violatedWord,
    messageText,
    timestamp: now,
  });

  // Increment metrics immediately
  metrics.filterViolations.inc();
};

/**
 * Check filter violations and auto-ban if threshold exceeded
 * Returns true if user should be banned
 */
const checkFilterViolations = async (ipHash) => {
  const now = Date.now();
  const windowStart = now - CONSTRAINTS.FILTER_VIOLATION_WINDOW;

  try {
    return await retryDatabaseOperation(() => {
      // Count violations within the time window
      const result = statements.countViolations.get(ipHash, windowStart);

      const violationCount = result.count;

      // Auto-ban if threshold exceeded
      if (violationCount >= CONSTRAINTS.FILTER_VIOLATION_THRESHOLD) {
        // Determine duration based on violation severity - defaults to TEMP (24h)
        const bannedUntil = now + (CONSTRAINTS.TEMP_BAN_DURATION || 24 * 60 * 60 * 1000);

        // Update reputation
        const currentRow = statements.checkUserModeration.get(ipHash);
        const currentRep = currentRow ? currentRow.reputation_score || 100 : 100;
        // Heavy penalty for auto-ban
        const newRep = Math.max(0, currentRep - 50);

        if (currentRow) {
          statements.banUser.run(bannedUntil, ipHash);
          statements.updateReputation.run(newRep, ipHash);
        } else {
          statements.insertUserBan.run(ipHash, bannedUntil, newRep);
        }

        // Invalidate cache when auto-banning
        banCache.delete(ipHash);

        // Log it
        statements.logModeration.run(
          'auto_ban',
          ipHash,
          `Auto-banned after ${violationCount} violations`,
          'system',
          now
        );

        if (!isProd) {
          logger.warn(
            `[Filter Auto-Ban] User ${ipHash.substring(0, 8)} banned after ${violationCount} filter violations`
          );
        }

        return true;
      }

      return false;
    }, 'checkFilterViolations');
  } catch (err) {
    logger.error(`[DB Error] Failed to check filter violations for ${ipHash.substring(0, 8)}:`, {
      error: err.message,
    });
    if (!isProd) {
      logger.error('Stack trace:', { stack: err.stack });
    }
    return false;
  }
};

const cleanupSession = (socketId) => {
  const session = socketStates.get(socketId);
  if (!session) {
    return;
  }

  // Clear any pending server-side typing timeout
  if (session.typingTimeout) {
    clearTimeout(session.typingTimeout);
    session.typingTimeout = null;
  }

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
  waitingQueue = waitingQueue.filter((id) => id !== socketId);
  metrics.queueLength.set(waitingQueue.length);

  if (session.state === 'chatting') {
    metrics.activeSessions.dec();
  }

  matchLock.delete(socketId);
  connectionRates.delete(socketId);
};

/**
 * SOCKET MIDDLEWARE
 */
io.use(async (socket, next) => {
  if (MAINTENANCE_MODE) {
    return next(new Error('maintenance'));
  }
  try {
    const ipHash = getIpHash(socket);
    const now = Date.now();

    // Sliding window cleanup for memory optimization
    connectionRates.forEach((rate, hash) => {
      if (now - rate.windowStart > CONSTRAINTS.CONN_RATE_WINDOW_MS) {
        connectionRates.delete(hash);
      }
    });

    // 1. Connection Rate Limiting
    const rate = connectionRates.get(ipHash) || { count: 0, windowStart: now };
    if (now - rate.windowStart > CONSTRAINTS.CONN_RATE_WINDOW_MS) {
      rate.count = 1;
      rate.windowStart = now;
    } else {
      rate.count++;
    }
    connectionRates.set(ipHash, rate);

    if (rate.count > CONSTRAINTS.CONN_RATE_LIMIT) {
      if (!isProd) {
        logger.warn(`Rate limited connection attempt: ${ipHash.substring(0, 8)}`);
      }
      return next(new Error('Too many connection attempts. Please wait a minute.'));
    }

    // 2. Ban Check
    if (await isUserBanned(ipHash)) {
      logger.warn(`Banned connection attempt: ${ipHash.substring(0, 8)}`);
      // We can attach a custom error property if we want the client to know specifically it's a ban
      const err = new Error('You are temporarily banned due to multiple reports.');
      err.data = { type: 'banned' };
      return next(err);
    }

    // 3. IP Range Check
    const ip = socket.conn.remoteAddress || socket.handshake.address;
    if (await isIpRangeBanned(ip)) {
      logger.warn(`IP Range Blocked: ${ip}`);
      return next(new Error('Access denied from your network range.'));
    }

    // 4. GeoIP Check for Sockets
    try {
      const highRisk = JSON.parse(process.env.HIGH_RISK_COUNTRIES);
      if (Array.isArray(highRisk) && highRisk.length > 0) {
        const ipAddr = socket.conn.remoteAddress; // socket.io stores remoteAddress here
        const geo = geoip.lookup(ipAddr);
        if (geo && highRisk.includes(geo.country)) {
          return next(new Error('Access denied from your region.'));
        }
      }
    } catch {
      /* GeoIP check failed or highRisk misconfigured, proceed without block */
    }

    next();
  } catch (err) {
    logger.error('Middleware error:', { error: err.message });
    next(new Error('Internal server error during connection.'));
  }
});

/**
 * SOCKET LOGIC
 */
io.on('connect', async (socket) => {
  const ipHash = getIpHash(socket);

  // safeEmit helper to wrap emits in try-catch
  const safeEmit = (socketOrRoom, event, ...args) => {
    try {
      socketOrRoom.emit(event, ...args);
    } catch (err) {
      logger.error(`Socket broadcast error [${event}]:`, { error: err.message });
    }
  };

  if (!isProd) {
    // Development-only logging
    logger.info(`Connection: ${socket.id} (Hash: ${ipHash.substring(0, 8)})`);
  }

  if (!isProd) {
    logger.info(`Connection: ${socket.id} (Hash: ${ipHash.substring(0, 8)})`);
  }
  metrics.connectedUsers.inc();

  // Challenge-Response Logic
  const powPrefix = crypto.randomBytes(8).toString('hex');
  const challengeTimeout = setTimeout(() => {
    if (socketStates.has(socket.id) && !socketStates.get(socket.id).isVerified) {
      socket.disconnect(true);
    }
  }, CONSTRAINTS.CHALLENGE_TIMEOUT);

  socketStates.set(socket.id, {
    state: 'challenging',
    partnerId: null,
    roomId: null,
    lastMsgAt: 0,
    lastMatchAt: 0,
    searchStartTime: 0,
    ipHash,
    reportsSent: 0,
    lastReportAt: 0,
    isVerified: false,
    powPrefix,
    challengeTimeout,
  });

  safeEmit(socket, 'challenge', {
    type: 'pow',
    prefix: powPrefix,
    complexity: CONSTRAINTS.POW_COMPLEXITY,
  });

  socket.on('solve_challenge', (response) => {
    // Validate response format
    if (typeof response !== 'string' || response.length > 100) {
      return socket.disconnect(true);
    }

    const session = socketStates.get(socket.id);
    if (!session || session.isVerified) {
      return;
    }

    // Verify PoW
    // Hash(prefix + response) should end with '0' * complexity
    const hash = crypto
      .createHash('sha256')
      .update(session.powPrefix + response)
      .digest('hex');
    const target = '0'.repeat(CONSTRAINTS.POW_COMPLEXITY);

    if (hash.endsWith(target)) {
      clearTimeout(session.challengeTimeout);
      session.isVerified = true;
      session.state = 'idle';
      session.powPrefix = null;
      session.challengeTimeout = null;
      safeEmit(socket, 'challenge_success');

      // Send initial online count only after verification
      safeEmit(socket, 'online_count', socketStates.size);
    } else {
      socket.disconnect(true);
    }
  });

  socket.on('ping_latency', (cb) => {
    if (typeof cb === 'function') {
      cb();
    }
  });

  socket.on('heartbeat', () => {
    socket.emit('pong');
  });

  socket.on('ping', (cb) => {
    if (typeof cb === 'function') {
      cb();
    }
  });

  socket.on('push_subscription', (sub) => {
    // Zod Validation
    const validation = Schemas.pushSubscription.safeParse(sub);
    if (!validation.success) {
      return;
    }

    const session = socketStates.get(socket.id);
    if (session) {
      session.pushSubscription = validation.data;
    }
  });

  // Remove direct emit of online_count here, moved to after challenge success

  socket.on('find_match', async (payload) => {
    try {
      const session = socketStates.get(socket.id);
      if (!session) {
        return;
      }

      // KILL SWITCH: Block matchmaking during maintenance (Phase 4.2)
      if (MAINTENANCE_MODE) {
        return socket.emit('error', {
          message: MAINTENANCE_REASON,
          type: 'maintenance',
        });
      }

      // Security: Ensure verified
      if (!session.isVerified) {
        return;
      }

      // Matchmaking Race Condition Fix: Pre-match Verification
      // If user is already in a non-idle state (e.g. chatting), reject request
      if (session.state === 'chatting' && session.partnerId) {
        return safeEmit(socket, 'sys_error', 'Already in an active chat.');
      }

      // Anti-Race Condition: If user is currently locked (processing a match), ignore new requests
      if (matchLock.has(socket.id)) {
        return;
      }

      // Honeypot Check: if payload contains keys it shouldn't, strictly ban
      if (payload && typeof payload === 'object' && payload.website_url) {
        // Bot detected
        return; // just ignore
      }

      // Harden cooldown (Gap #3)
      const now = Date.now();
      if (now - session.lastMatchAt < CONSTRAINTS.REQUEUE_COOLDOWN_MS) {
        return;
      }

      // Step 6: Enforce Ban During Matchmaking
      if (await isUserBanned(session.ipHash)) {
        safeEmit(socket, 'banned', { reason: 'Your ban is still active.' });
        safeEmit(socket, 'sys_error', 'Your ban is still active.');
        socket.disconnect(true);
        return;
      }

      // Explicit cleanup before requeue (Gap #1)
      cleanupSession(socket.id);
      transitionState(socket.id, 'waiting');

      // Matchmaking with Race Condition Protection
      // Lock timing fix: Set lock BEFORE checking queue to avoid race
      matchLock.set(socket.id, true);

      if (waitingQueue.length > 0) {
        let matched = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 3;

        while (attempts < MAX_ATTEMPTS && waitingQueue.length > 0 && !matched) {
          attempts++;
          const partnerId = waitingQueue.shift();

          if (partnerId === socket.id) {
            continue;
          }

          const partnerSocket = io.sockets.sockets.get(partnerId);
          const partnerSession = socketStates.get(partnerId);

          // Robust check for both sessions
          // Double-Match Prevention: Ensure partner is not already matched or locked
          if (
            !partnerSocket ||
            partnerSocket.disconnected ||
            !partnerSession ||
            partnerSession.state !== 'waiting' ||
            partnerSession.partnerId // Partner already has a partnerId?
          ) {
            continue;
          }

          // ATOMICITY: Check if partner is being matched by someone else
          if (matchLock.has(partnerId)) {
            waitingQueue.push(partnerId); // Re-queue
            continue;
          }
          matchLock.set(partnerId, true);

          matched = true;
          const roomId = uuidv4();

          try {
            // Join both to room
            socket.join(roomId);
            partnerSocket.join(roomId);

            // RACE CONDITION FIX: Verify both users actually joined and are still connected
            const room = io.sockets.adapter.rooms.get(roomId);
            if (!room || room.size !== 2 || socket.disconnected || partnerSocket.disconnected) {
              // Cleanup on failure
              socket.leave(roomId);
              partnerSocket.leave(roomId);

              if (!socket.disconnected) {
                safeEmit(socket, 'sys_error', 'Matchmaking failed, please try again');
                // Re-queue
                cleanupSession(socket.id);
                transitionState(socket.id, 'waiting');
                waitingQueue.push(socket.id);
              }
              if (partnerSocket && !partnerSocket.disconnected) {
                safeEmit(partnerSocket, 'sys_error', 'Matchmaking failed, please try again');
                transitionState(partnerId, 'waiting');
                waitingQueue.push(partnerId);
              }

              matchLock.delete(socket.id);
              matchLock.delete(partnerId);
              return;
            }

            // Transactional State Transition
            // If any error occurs here, we must rollback
            try {
              transitionState(socket.id, 'chatting', { partnerId, roomId, lastMatchAt: now });
              transitionState(partnerId, 'chatting', {
                partnerId: socket.id,
                roomId,
                lastMatchAt: now,
              });
            } catch (transitionErr) {
              // Rollback
              logger.error('State transition failed', { error: transitionErr.message });
              cleanupSession(socket.id);
              cleanupSession(partnerId);
              socket.leave(roomId);
              partnerSocket.leave(roomId);
              matchLock.delete(socket.id);
              matchLock.delete(partnerId);
              return;
            }

            if (session.searchStartTime) {
              metrics.matchmakingDuration.observe((now - session.searchStartTime) / 1000);
            }
            if (partnerSession.searchStartTime) {
              metrics.matchmakingDuration.observe((now - partnerSession.searchStartTime) / 1000);
            }

            io.to(roomId).emit('matched');
            metrics.queueLength.set(waitingQueue.length);
            metrics.activeSessions.inc();
            matchLock.delete(socket.id);
            matchLock.delete(partnerId);
            return;
          } catch (err) {
            logger.error('Matchmaking transaction failed', { error: err.message });
            matchLock.delete(socket.id);
            matchLock.delete(partnerId);
            return;
          }
        }
      }

      // If we didn't find a match (or queue provided no valid partners), we are now "waiting"
      matchLock.delete(socket.id);

      // Rate limit find_match: max 5 attempts/minute
      if (!RateLimiter.check(`${session.ipHash}_find_match`, 5, 60000)) {
        return safeEmit(
          socket,
          'sys_error',
          'Matchmaking rate limit exceeded. Please wait a minute.'
        );
      }

      // Default: Join queue
      // Queue Duplicate Prevention
      if (!waitingQueue.includes(socket.id)) {
        session.searchStartTime = Date.now();
        waitingQueue.push(socket.id);
        metrics.queueLength.set(waitingQueue.length);
        safeEmit(socket, 'searching');
      }
    } catch (err) {
      logger.error('Error in find_match handler:', { error: err.message, socketId: socket.id });
      safeEmit(socket, 'sys_error', 'An error occurred while finding a match.');
      matchLock.delete(socket.id);
    }
  });

  socket.on('send_msg', async (rawText) => {
    if (MAINTENANCE_MODE) {
      return safeEmit(socket, 'error', { message: MAINTENANCE_REASON, type: 'maintenance' });
    }
    try {
      // Zod Validation
      const result = Schemas.message.safeParse(rawText);
      if (!result.success) {
        return;
      }

      const text = sanitize(result.data);
      if (!text) {
        return;
      } // double check after sanitization

      const session = socketStates.get(socket.id);
      if (!session || session.state !== 'chatting') {
        return;
      }

      const now = Date.now();

      // 1. Rate Limiting: max 15 messages/minute (increased from 10)
      if (!RateLimiter.check(`${session.ipHash}_send_msg`, 15, 60000)) {
        return safeEmit(socket, 'sys_error', 'Message rate limit exceeded. Please slow down.');
      }

      if (now - session.lastMsgAt < CONSTRAINTS.MSG_RATE_LIMIT_MS) {
        return;
      }
      session.lastMsgAt = now;

      // 2. Profanity/Spam Filter with Escalation Logic
      const filterResult = await checkMessageAgainstFilter(text, session.ipHash);

      if (filterResult.blocked) {
        if (filterResult.severity >= 2) {
          await recordFilterViolation(session.ipHash, filterResult.word, text);
          metrics.filterViolations.inc();
        }

        metrics.messageCounter.inc({ status: 'blocked' });

        if (filterResult.severity >= 2) {
          // High Severity (3) -> 7 Days, Medium (2) -> 24 Hours
          const duration =
            filterResult.severity === 3
              ? CONSTRAINTS.BAN_DURATION_HIGH || 7 * 24 * 60 * 60 * 1000
              : CONSTRAINTS.BAN_DURATION_MEDIUM || 24 * 60 * 60 * 1000;

          const bannedUntil = now + duration;

          try {
            await retryDatabaseOperation(() => {
              const existing = statements.checkUserModeration.get(session.ipHash);
              const currentRep = existing ? existing.reputation_score || 100 : 100;
              const penalty = filterResult.severity === 3 ? 50 : 30;
              const newRep = Math.max(0, currentRep - penalty);

              statements.upsertBan.run(session.ipHash, bannedUntil); // Removed redundant bannedUntil argument
              statements.updateReputation.run(newRep, session.ipHash);
              statements.logModeration.run(
                'filter_ban',
                session.ipHash,
                `Banned for usage of severity ${filterResult.severity} word: ${filterResult.word}`,
                'system',
                now
              );
            }, 'upsertBan');
          } catch (err) {
            logger.error('DB Error banning user:', { error: err.message });
          }

          safeEmit(socket, 'banned', { reason: 'You have been banned for prohibited content.' });
          safeEmit(socket, 'sys_error', 'You have been banned for prohibited content.');
          socket.disconnect(true);
          return;
        }

        // Severity 1: Warning + Accumulation
        if (filterResult.severity === 1) {
          const shouldBan = await checkFilterViolations(session.ipHash);
          if (shouldBan) {
            safeEmit(socket, 'banned', { reason: 'You have been banned for repeated violations.' });
            safeEmit(socket, 'sys_error', 'You have been banned for repeated violations.');
            socket.disconnect(true);
            return;
          }
        }

        return safeEmit(socket, 'sys_error', 'Message blocked by filter.');
      }

      if (!session.roomId) {
        return;
      }

      // Validation for socket.to: Ensure room exists
      try {
        // Message Batching (Phase 3.2)
        if (!session.msgBuffer) {
          session.msgBuffer = [];
        }
        session.msgBuffer.push({ text });

        if (!session.batchTimeout) {
          session.batchTimeout = setTimeout(() => {
            const batch = session.msgBuffer;
            session.msgBuffer = [];
            session.batchTimeout = null;

            if (batch.length === 1) {
              socket.to(session.roomId).emit('receive_msg', batch[0]);
            } else {
              socket.to(session.roomId).emit('receive_msg_batch', batch);
            }
            metrics.messageCounter.inc({ status: 'success' }, batch.length);
          }, 100);
        }

        // Push Notification
        const partnerSession = socketStates.get(session.partnerId);
        if (partnerSession && partnerSession.pushSubscription) {
          const payload = JSON.stringify({
            title: 'New Message',
            body: 'Stranger sent a message',
            url: '/',
          });
          webpush.sendNotification(partnerSession.pushSubscription, payload).catch((_e) => { });
        }
      } catch (err) {
        logger.error('Error emitting message to room:', err);
      }
    } catch (err) {
      logger.error('Error in send_msg handler:', { error: err.message, socketId: socket.id });
      safeEmit(socket, 'sys_error', 'Failed to send message.');
    }
  });

  socket.on('report_user', async (payload) => {
    try {
      // Zod Validation for report payload (even if optional/empty)
      const validation = Schemas.report.safeParse(payload);
      if (!validation.success) {
        return;
      }

      const session = socketStates.get(socket.id);
      if (session && session.state === 'chatting' && session.partnerId) {
        const now = Date.now();

        if (now - session.lastReportAt > CONSTRAINTS.REPORT_RATE_WINDOW) {
          session.reportsSent = 0;
        }

        if (session.reportsSent >= CONSTRAINTS.REPORT_RATE_LIMIT) {
          safeEmit(socket, 'sys_error', 'Report rate limit exceeded. Please try again later.');
          return;
        }

        const partnerSession = socketStates.get(session.partnerId);
        if (partnerSession && partnerSession.ipHash) {
          if (!isProd) {
            // Development-only logging
            logger.info(
              `REPORT: User ${socket.id} reported partner ${session.partnerId} (IP Hash: ${partnerSession.ipHash.substring(0, 8)})`
            );
          }
          await reportUser(partnerSession.ipHash);
          session.reportsSent++;
          session.lastReportAt = now;
          safeEmit(socket, 'sys_info', 'Partner reported.');
        }
      }
    } catch (err) {
      logger.error('Error in report_user handler:', { error: err.message, socketId: socket.id });
      safeEmit(socket, 'sys_error', 'Failed to report user.');
    }
  });

  socket.on('typing', (isTyping) => {
    // Zod Validation
    const result = Schemas.typing.safeParse(isTyping);
    if (!result.success) {
      return;
    }

    const validIsTyping = result.data;

    const session = socketStates.get(socket.id);
    if (session && session.state === 'chatting' && session.roomId) {
      // Typing specific rate limit: max 1/second
      const now = Date.now();
      if (session.lastTypingEmit && now - session.lastTypingEmit < 1000) {
        return;
      }
      session.lastTypingEmit = now;

      if (io.sockets.adapter.rooms.has(session.roomId)) {
        try {
          socket.to(session.roomId).emit('partner_typing', validIsTyping);

          if (session.typingTimeout) {
            clearTimeout(session.typingTimeout);
          }

          if (validIsTyping) {
            session.typingTimeout = setTimeout(() => {
              if (socketStates.has(socket.id)) {
                try {
                  socket.to(session.roomId).emit('partner_typing', false);
                  session.typingTimeout = null;
                } catch (e) {
                  logger.error('Auto-clear typing error:', { error: e.message });
                }
              }
            }, 3000);
          }
        } catch (e) {
          logger.error('Typing handler error:', { error: e.message });
        }
      }
    }
  });

  socket.on('leave_chat', () => {
    const session = socketStates.get(socket.id);
    if (!session) {
      return;
    }

    if (session.roomId) {
      socket.leave(session.roomId);
    }
    cleanupSession(socket.id);
    transitionState(socket.id, 'idle', { partnerId: null, roomId: null });
  });

  socket.on('admin_auth', (password) => {
    // Rate Limit: 5 attempts per IP per 15 mins
    const now = Date.now();
    const adminRateKey = `${ipHash}_admin_auth`;
    const rate = connectionRates.get(adminRateKey) || { count: 0, windowStart: now };

    // Reset window if needed
    if (now - rate.windowStart > 15 * 60 * 1000) {
      rate.count = 0;
      rate.windowStart = now;
    }

    if (rate.count >= 5) {
      return safeEmit(socket, 'admin_auth_failed', { reason: 'Too many attempts' });
    }

    rate.count++;
    connectionRates.set(adminRateKey, rate);

    if (password === process.env.ADMIN_PASSWORD) {
      socket.join('admin_room');
      safeEmit(socket, 'admin_auth_success');
      // Log successful admin auth
      logger.info(`Admin socket auth successful for ${ipHash}`);
    } else {
      safeEmit(socket, 'admin_auth_failed');
      logger.warn(`Admin socket auth failed for ${ipHash}`);
    }
  });

  socket.on('disconnect', () => {
    cleanupSession(socket.id);
    socketStates.delete(socket.id);
    metrics.connectedUsers.dec();
  });
});

// Broadcast online count every 30 seconds
const onlineInterval = setInterval(() => {
  io.emit('online_count', socketStates.size);
  /*io.emit is wrapper for broadcast which might fail if underlying transport issues, 
        but it shouldn't crash the server. Explicit try-catch just in case*/
  /* Note: io.emit returns boolean/void, not async. Internally handles some errors but good practice. */
}, 30000);
backgroundTasks.intervals.push(onlineInterval);

// Cleanup connection rate limits every hour
const rateLimitCleanup = setInterval(
  () => {
    connectionRates.clear();
  },
  60 * 60 * 1000
);
backgroundTasks.intervals.push(rateLimitCleanup);

/**
 * ADMIN API ROUTES
 */
app.get('/admin/api/banned-words', requireAdmin, (_req, res) => {
  try {
    const words = db.prepare('SELECT * FROM banned_words ORDER BY created_at DESC').all();
    res.json(words);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/api/banned-words', requireAdmin, (req, res) => {
  const result = Schemas.bannedWord.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }

  const { word, severity, is_regex } = result.data;

  try {
    db.prepare(
      'INSERT INTO banned_words (word, severity, is_regex, created_at, enabled) VALUES (?, ?, ?, ?, 1)'
    ).run(word.toLowerCase(), severity, is_regex ? 1 : 0, Date.now());
    bannedWordsCache = []; // Invalidate cache

    statements.logModeration.run(
      'add_banned_word',
      null,
      `Word: ${word}, Severity: ${severity}, Regex: ${!!is_regex}`,
      'admin',
      Date.now()
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/api/banned-words/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM banned_words WHERE id = ?').run(req.params.id);
    bannedWordsCache = [];
    statements.logModeration.run(
      'delete_banned_word',
      null,
      `ID: ${req.params.id}`,
      'admin',
      Date.now()
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/admin/api/banned-words/:id', requireAdmin, (req, res) => {
  const { severity, enabled } = req.body;
  try {
    if (severity) {
      db.prepare('UPDATE banned_words SET severity = ? WHERE id = ?').run(severity, req.params.id);
    }
    if (enabled !== undefined) {
      db.prepare('UPDATE banned_words SET enabled = ? WHERE id = ?').run(
        enabled ? 1 : 0,
        req.params.id
      );
    }
    bannedWordsCache = [];

    statements.logModeration.run(
      'update_banned_word',
      null,
      `ID: ${req.params.id}, Severity: ${severity}, Enabled: ${enabled}`,
      'admin',
      Date.now()
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/api/violations', requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    const searchPattern = `%${search}%`;
    const total = db
      .prepare(
        'SELECT COUNT(DISTINCT ip_hash) as count FROM filter_violations WHERE created_at > ? AND ip_hash LIKE ?'
      )
      .get(Date.now() - 86400000, searchPattern).count;

    const violations = db
      .prepare(
        `
            SELECT ip_hash, COUNT(*) as count, MAX(created_at) as last_seen 
            FROM filter_violations 
            WHERE created_at > ? AND ip_hash LIKE ?
            GROUP BY ip_hash 
            ORDER BY count DESC
            LIMIT ? OFFSET ?
        `
      )
      .all(Date.now() - 86400000, searchPattern, limit, offset);
    res.json({ data: violations, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/api/violations/export', requireAdmin, (_req, res) => {
  try {
    const violations = db
      .prepare(
        'SELECT ip_hash, violated_word, message_text, created_at FROM filter_violations ORDER BY created_at DESC'
      )
      .all();

    let csv = 'IP Hash,Word,Message,Date\n';
    violations.forEach((v) => {
      csv += `"${v.ip_hash}","${v.violated_word.replace(/"/g, '""')}","${(v.message_text || '').replace(/"/g, '""')}","${new Date(v.created_at).toISOString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="violations_export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/api/bans', requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    const searchPattern = `%${search}%`;
    const total = db
      .prepare(
        'SELECT COUNT(*) as count FROM user_moderation WHERE banned_until > ? AND ip_hash LIKE ?'
      )
      .get(Date.now(), searchPattern).count;

    const bans = db
      .prepare(
        `
            SELECT * FROM user_moderation 
            WHERE banned_until > ? AND ip_hash LIKE ?
            ORDER BY banned_until DESC
            LIMIT ? OFFSET ?
        `
      )
      .all(Date.now(), searchPattern, limit, offset);
    res.json({ data: bans, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/api/bans/export', requireAdmin, (_req, res) => {
  try {
    const bans = db
      .prepare(
        'SELECT ip_hash, reports, banned_until, reputation_score FROM user_moderation WHERE banned_until > ? ORDER BY banned_until DESC'
      )
      .all(Date.now());

    let csv = 'IP Hash,Reports,Banned Until,Reputation\n';
    bans.forEach((b) => {
      csv += `"${b.ip_hash}",${b.reports},"${new Date(b.banned_until).toISOString()}",${b.reputation_score}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="active_bans_export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/api/bans', requireAdmin, (req, res) => {
  const validation = Schemas.manualBan.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid input', details: validation.error.errors });
  }

  const { ipHash, duration, reason } = validation.data;
  const bannedUntil = Date.now() + duration * 24 * 60 * 60 * 1000;

  try {
    statements.upsertBan.run(ipHash, bannedUntil, bannedUntil);
    statements.logModeration.run('manual_ban', ipHash, reason, 'admin', Date.now());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Moderation Queue
app.get('/admin/api/moderation/queue', requireAdmin, (_req, res) => {
  try {
    const flagged = statements.getFlaggedMessages.all();
    res.json(flagged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/api/moderation/queue/:id/action', requireAdmin, (req, res) => {
  const { action } = req.body; // approve (ignore/clear), ban (punish)
  if (!['approve', 'ban'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    statements.updateFlaggedMessageStatus.run(action, req.params.id);

    if (action === 'ban') {
      // Fetch message to get IP
      const msg = db.prepare('SELECT * FROM flagged_messages WHERE id = ?').get(req.params.id);
      if (msg) {
        const bannedUntil = Date.now() + CONSTRAINTS.BAN_DURATION_MEDIUM;
        statements.upsertBan.run(msg.ip_hash, bannedUntil, bannedUntil);
        statements.logModeration.run(
          'queue_ban',
          msg.ip_hash,
          'Banned from moderation queue',
          'admin',
          Date.now()
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin IP Range Bans
app.post('/admin/api/ban-range', requireAdmin, (req, res) => {
  const { cidr, reason } = req.body;
  // Simple CIDR validation regex
  if (!/^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/.test(cidr)) {
    return res.status(400).json({ error: 'Invalid CIDR format' });
  }

  try {
    statements.addBannedRange.run(cidr, reason || 'Manual Range Ban', 'admin', Date.now());
    statements.logModeration.run('ban_range', null, `Banned CIDR: ${cidr}`, 'admin', Date.now());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/api/ban-range', requireAdmin, (_req, res) => {
  try {
    const ranges = statements.getAllBannedRanges.all();
    res.json(ranges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderation Dashboard Stats (Enhanced)
app.get('/admin/api/dashboard/stats', requireAdmin, (_req, res) => {
  try {
    const totalViolations = db
      .prepare('SELECT COUNT(*) as count FROM filter_violations')
      .get().count;
    const activeBans = db
      .prepare('SELECT COUNT(*) as count FROM user_moderation WHERE banned_until > ?')
      .get(Date.now()).count;
    const pendingAppeals = db
      .prepare("SELECT COUNT(*) as count FROM appeals WHERE status = 'pending'")
      .get().count;
    const queueCount = db
      .prepare("SELECT COUNT(*) as count FROM flagged_messages WHERE status = 'pending'")
      .get().count;

    // Top Violators
    const topViolators = db
      .prepare(
        `
           SELECT ip_hash, COUNT(*) as count 
           FROM filter_violations 
           GROUP BY ip_hash 
           ORDER BY count DESC 
           LIMIT 5
       `
      )
      .all();

    // Violations in last 24h
    const recentViolations = db
      .prepare(
        `
           SELECT COUNT(*) as count 
           FROM filter_violations 
           WHERE created_at > ?
       `
      )
      .get(Date.now() - 86400000).count;

    res.json({
      totalViolations,
      activeBans,
      pendingAppeals,
      queueCount,
      topViolators,
      recentViolations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/admin/api/bans/:ipHash', requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE user_moderation SET banned_until = NULL WHERE ip_hash = ?').run(
      req.params.ipHash
    );

    statements.logModeration.run(
      'lift_ban',
      req.params.ipHash,
      'Ban lifted manually by admin',
      'admin',
      Date.now()
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    const dbHealth = checkDatabaseHealth();
    let dbWriteable = false;

    if (dbHealth) {
      try {
        db.prepare('CREATE TEMPORARY TABLE IF NOT EXISTS health_check (id INTEGER)').run();
        dbWriteable = true;
      } catch {
        dbWriteable = false;
      }
    }

    const status = {
      status: dbHealth && dbWriteable ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      db: {
        connected: dbHealth,
        writeable: dbWriteable,
      },
      sockets: {
        connected: io.engine.clientsCount,
        vapid: pushNotificationsEnabled,
        initialization: initializationState,
      },
    };

    res.status(status.status === 'healthy' ? 200 : 503).json(status);
  } catch (err) {
    logger.error('Health check failed:', { error: err.message, stack: err.stack });
    res.status(500).json({ status: 'error', error: 'Internal server health error' });
  }
});

// Centralized Error Handler (Phase 5.2)
app.use((err, _req, res, _) => {
  // Handle Body Parser JSON Syntax Errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  logger.error('Unhandled request error:', {
    error: err.message,
    stack: err.stack,
    requestId: _req.requestId,
    url: _req.originalUrl,
  });
  res.status(500).json({ error: 'Internal server error', requestId: _req.requestId });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

app.get('/admin/api/stats', requireAdmin, (_req, res) => {
  try {
    const violationStats = db.prepare('SELECT COUNT(*) as count FROM filter_violations').get();
    const banStats = db
      .prepare('SELECT COUNT(*) as count FROM user_moderation WHERE banned_until > ?')
      .get(Date.now());
    const totalReports = db.prepare('SELECT SUM(reports) as count FROM user_moderation').get();

    res.json({
      activeConnections: socketStates.size,
      violationCount: violationStats.count,
      activeBans: banStats.count,
      totalReports: totalReports.count || 0,
      waitingUsers: waitingQueue.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Admin Panel: http://localhost:${PORT}/admin.html\n`);
    logger.info(`Server running on port ${PORT}`);
  });
}

export {
  app,
  server,
  io,
  sanitize,
  getIpHash,
  transitionState,
  socketStates,
  checkDatabaseHealth,
  retryDatabaseOperation,
  checkMessageAgainstFilter,
  reportUser,
  recordFilterViolation,
  checkFilterViolations,
  db,
};
/**
 * GRACEFUL SHUTDOWN (Phase 8.3)
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop Accepting Connections & Notify
  MAINTENANCE_MODE = true;
  io.emit('sys_error', 'Server is restarting for maintenance. Please wait...');

  // 2. Cancel Background Tasks
  logger.info('Stopping background tasks...');
  backgroundTasks.intervals.forEach((id) => clearInterval(id));
  backgroundTasks.cronJobs.forEach((job) => job.stop());
  backgroundTasks.timeouts.forEach((id) => clearTimeout(id));

  // 3. Flush Pending Operations
  logger.info('Flushing pending operations...');
  flushViolationBatch();
  // Wait a moment for DB writes to settle
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 4. Disconnect Sockets
  logger.info('Disconnecting sockets...');
  socketStates.forEach((_, socketId) => {
    cleanupSession(socketId);
  });
  io.disconnectSockets(true);

  // 5. Close Servers
  io.close(() => {
    logger.info('Socket.IO server closed');
    server.close(() => {
      logger.info('HTTP server closed.');

      // 6. Cleanup Database
      if (db) {
        try {
          // Clear Prepared Statements
          statements = {};
          banCache.clear();
          userCache.clear();

          // Log Final Stats
          try {
            const walSize = fs.statSync(path.join(dbPath, process.env.DB_NAME + '-wal')).size;
            logger.info('Database Shutdown Stats', { walSize });
          } catch {
            /* ignore if file doesn't exist */
          }

          db.pragma('optimize');
          db.checkpoint(); // Checkpoint WAL
          db.close();
          logger.info('Database connection closed.');
        } catch (err) {
          logger.error('Error closing database:', { error: err.message });
          // Emergency checkpoint attempt if close failed
          try {
            if (db && db.open) {
              db.pragma('wal_checkpoint(TRUNCATE)');
            }
          } catch {
            /* ignore checkpoint error during shutdown */
          }
        }
      }

      logger.info('Graceful shutdown completed.');
      process.exit(0);
    });
  });

  // Force shutdown after timeout (Reduced to 10s)
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    // Log what might be pending if possible
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
