/**
 * Integration tests for Admin API endpoints
 */
import request from 'supertest';
import { app, server, db } from '../server.js';

describe('Admin API Integration Tests', () => {
  let _authCookie;
  const adminPassword = process.env.ADMIN_PASSWORD || 'strong-secret';

  beforeAll(() => {
    // Ensure database is initialized
    if (db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS filter_violations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip_hash TEXT NOT NULL,
          violated_word TEXT NOT NULL,
          message_text TEXT,
          created_at INTEGER NOT NULL
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_moderation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip_hash TEXT UNIQUE NOT NULL,
          reports INTEGER DEFAULT 0,
          last_report_at INTEGER,
          reputation_score INTEGER DEFAULT 100,
          banned_until INTEGER
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS banned_words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT UNIQUE NOT NULL,
          severity INTEGER NOT NULL,
          is_regex INTEGER DEFAULT 0,
          created_at INTEGER,
          enabled INTEGER DEFAULT 1
        )
      `);
    }
  });

  afterAll((done) => {
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Clear test data
    if (db) {
      db.exec('DELETE FROM filter_violations');
      db.exec('DELETE FROM user_moderation');
      db.exec('DELETE FROM banned_words');
    }
  });

  describe('POST /admin/api/login', () => {
    test('should reject login without password', async () => {
      const res = await request(app).post('/admin/api/login').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should reject login with wrong password', async () => {
      const res = await request(app).post('/admin/api/login').send({ password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });

    test('should accept login with correct password', async () => {
      const res = await request(app).post('/admin/api/login').send({ password: adminPassword });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.headers['set-cookie']).toBeDefined();

      // Store cookie for authenticated requests (handled by agent in later tests)
    });

    test('should bypass rate limiting in test environment', async () => {
      // Make 10 login attempts (limit is 5)
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(request(app).post('/admin/api/login').send({ password: 'wrong' }));
      }

      const results = await Promise.all(promises);
      const rateLimited = results.some((res) => res.status === 429);
      expect(rateLimited).toBe(false);
    });
  });

  describe('Authenticated Endpoints', () => {
    let agent;

    beforeEach(async () => {
      agent = request.agent(app);
      await agent.post('/admin/api/login').send({ password: adminPassword });

      // Populate data
      if (db) {
        const now = Date.now();
        const stmt = db.prepare(
          'INSERT INTO filter_violations (ip_hash, violated_word, message_text, created_at) VALUES (?, ?, ?, ?)'
        );
        stmt.run('hash1', 'bad', 'Bad word message', now);
        stmt.run('hash2', 'spam', 'Spam message', now);
      }
    });

    test('should return violations', async () => {
      const res = await agent.get('/admin/api/violations');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('should return bans', async () => {
      // Add a ban
      if (db) {
        db.prepare('INSERT INTO user_moderation (ip_hash, banned_until) VALUES (?, ?)').run(
          'banned_hash',
          Date.now() + 100000
        );
      }
      const res = await agent.get('/admin/api/bans');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.some((b) => b.ip_hash === 'banned_hash')).toBe(true);
    });

    test('should create manual ban', async () => {
      const ipHash = 'b'.repeat(64);
      const res = await agent.post('/admin/api/bans').send({
        ipHash,
        duration: 7,
        reason: 'Manual test ban',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('should unban IP hash', async () => {
      const ipHash = 'c'.repeat(64);
      if (db) {
        db.prepare('INSERT INTO user_moderation (ip_hash, banned_until) VALUES (?, ?)').run(
          ipHash,
          Date.now() + 100000
        );
      }

      const res = await agent.delete('/admin/api/bans/' + ipHash);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('should return statistics', async () => {
      const res = await agent.get('/admin/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('violationCount');
      expect(res.body).toHaveProperty('activeBans');
    });

    test('should export violations as CSV', async () => {
      const res = await agent.get('/admin/api/violations/export');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Error Handling', () => {
    let agent;

    beforeEach(async () => {
      agent = request.agent(app);
      await agent.post('/admin/api/login').send({ password: adminPassword });
    });

    test('should handle malformed JSON', async () => {
      const res = await agent
        .post('/admin/api/bans')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(res.status).toBe(400);
    });
  });
});
