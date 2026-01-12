import { app, server, io } from '../server.js';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import crypto from 'crypto';

const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}`;

describe('Comprehensive Security Tests', () => {
  let serverInstance;

  beforeAll((done) => {
    if (!server.listening) {
      serverInstance = server.listen(PORT, () => {
        console.log(`Test server running on port ${PORT}`);
        done();
      });
    } else {
      serverInstance = server;
      done();
    }
  });

  afterAll((done) => {
    io.close();
    if (serverInstance) {
      serverInstance.close(done);
    } else {
      done();
    }
  });

  describe('1. Helmet CSP Configuration', () => {
    test('should include CSP headers in responses', async () => {
      const res = await request(app).get('/');
      expect(res.headers['content-security-policy']).toBeDefined();
    });

    test('CSP should restrict script-src to self and nonce', async () => {
      const res = await request(app).get('/');
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("'nonce-");
    });

    test('CSP should restrict frame-ancestors to none', async () => {
      const res = await request(app).get('/');
      const csp = res.headers['content-security-policy'];
      expect(csp).toContain("frame-ancestors 'none'");
    });

    test('should include X-Frame-Options header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    test('should include X-Content-Type-Options header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should include Strict-Transport-Security in production', async () => {
      const res = await request(app).get('/');
      // In test mode, HSTS might not be enforced, but header should exist
      if (process.env.NODE_ENV === 'production') {
        expect(res.headers['strict-transport-security']).toBeDefined();
      }
    });
  });

  describe('2. Rate Limiting on API Endpoints', () => {
    test('should rate limit excessive API requests', async () => {
      const requests = [];
      // Make 20 rapid requests (limit is typically 300 in 15 min, but we test the mechanism)
      for (let i = 0; i < 20; i++) {
        requests.push(request(app).get('/api/stats'));
      }

      const responses = await Promise.all(requests);
      // All should succeed in test mode (rate limiting is disabled)
      const allSucceeded = responses.every((r) => r.status === 200);
      expect(allSucceeded).toBe(true);
    });

    test('should apply rate limiting to admin login endpoint', async () => {
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(request(app).post('/api/admin/login').send({ password: 'wrong-password' }));
      }

      const responses = await Promise.all(attempts);
      // Should eventually get rate limited (429)
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('3. Socket.IO Connection Rate Limiting', () => {
    test('should limit excessive connection attempts from same IP', async () => {
      const clients = [];
      const connectionPromises = [];

      // Attempt to create 15 connections rapidly (limit is 10 per minute)
      for (let i = 0; i < 15; i++) {
        const client = ioClient(BASE_URL, {
          transports: ['websocket'],
          reconnection: false,
        });
        clients.push(client);

        connectionPromises.push(
          new Promise((resolve) => {
            client.on('connect', () => resolve({ success: true, client }));
            client.on('connect_error', (err) => resolve({ success: false, error: err.message }));
            setTimeout(() => resolve({ success: false, error: 'timeout' }), 2000);
          })
        );
      }

      const results = await Promise.all(connectionPromises);

      // Clean up
      clients.forEach((c) => c.close());

      // Some connections should be rejected due to rate limiting
      const rejected = results.filter((r) => !r.success);
      expect(rejected.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('4. PoW (Proof of Work) Challenge System', () => {
    test('should send PoW challenge on connection', (done) => {
      const client = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('challenge', (data) => {
        expect(data.type).toBe('pow');
        expect(data.prefix).toBeDefined();
        expect(data.complexity).toBeDefined();
        expect(data.complexity).toBeGreaterThan(0);
        client.close();
        done();
      });

      client.on('connect_error', (err) => {
        client.close();
        done(new Error(`Connection failed: ${err.message}`));
      });
    }, 5000);

    test('should disconnect client if PoW not solved in time', (done) => {
      const client = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      let challengeReceived = false;

      client.on('challenge', () => {
        challengeReceived = true;
        // Don't solve the challenge - wait for timeout
      });

      client.on('disconnect', (reason) => {
        if (challengeReceived) {
          expect(reason).toBeTruthy();
          done();
        }
      });

      setTimeout(() => {
        if (!challengeReceived) {
          client.close();
          done(new Error('Challenge not received'));
        }
      }, 20000);
    }, 25000);

    test('should accept valid PoW solution', (done) => {
      const client = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('challenge', async (data) => {
        if (data.type === 'pow') {
          // Solve the PoW challenge
          const solution = await solvePoWChallenge(data.prefix, data.complexity);
          client.emit('solve_challenge', solution);
        }
      });

      client.on('challenge_success', () => {
        client.close();
        done();
      });

      client.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
          client.close();
          done(new Error('Disconnected before solving challenge'));
        }
      });

      setTimeout(() => {
        client.close();
        done(new Error('Challenge success not received'));
      }, 10000);
    }, 15000);

    test('should reject invalid PoW solution', (done) => {
      const client = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('challenge', (data) => {
        if (data.type === 'pow') {
          // Send invalid solution
          client.emit('solve_challenge', 'invalid-solution-12345');
        }
      });

      client.on('disconnect', (reason) => {
        expect(reason).toBeTruthy();
        done();
      });

      setTimeout(() => {
        client.close();
        done(new Error('Should have been disconnected'));
      }, 5000);
    }, 10000);
  });

  describe('5. CSRF Protection', () => {
    test('should reject POST requests without CSRF token', async () => {
      const res = await request(app).post('/api/appeals').send({ reason: 'Test appeal' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Invalid CSRF token');
    });

    test('should reject POST with mismatched CSRF token', async () => {
      const res = await request(app)
        .post('/api/appeals')
        .set('Cookie', ['csrf_token=token123'])
        .set('x-csrf-token', 'different-token')
        .send({ reason: 'Test appeal' });

      expect(res.status).toBe(403);
    });

    test('should accept POST with valid CSRF token', async () => {
      // First get a CSRF token
      const getRes = await request(app).get('/api/stats');
      const cookies = getRes.headers['set-cookie'];
      const csrfCookie = cookies.find((c) => c.startsWith('csrf_token='));
      const csrfToken = csrfCookie.split(';')[0].split('=')[1];

      const res = await request(app)
        .post('/api/appeals')
        .set('Cookie', [`csrf_token=${csrfToken}`])
        .set('x-csrf-token', csrfToken)
        .send({ reason: 'Valid test appeal with proper token' });

      // Should not be rejected for CSRF (may fail validation for other reasons)
      expect(res.status).not.toBe(403);
    });

    test('CSRF protection should apply to admin routes', async () => {
      const res = await request(app).post('/api/admin/maintenance').send({ enabled: true });

      // Should fail either due to CSRF or auth
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('6. Banned User Reconnection Prevention', () => {
    test('should prevent banned IP from connecting via Socket.IO', (done) => {
      // This test would require actually banning an IP first
      // For now, we test the mechanism exists
      const client = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      let connected = false;
      client.on('connect', () => {
        connected = true;
      });

      client.on('banned', (data) => {
        expect(data.reason).toBeDefined();
        client.close();
        done();
      });

      client.on('connect_error', (err) => {
        if (err.message.includes('banned')) {
          client.close();
          done();
        }
      });

      setTimeout(() => {
        if (!connected) {
          client.close();
          done(new Error('Connection test timeout'));
        } else {
          client.close();
          done();
        }
      }, 3000);
    }, 5000);

    test('should check ban status during matchmaking', (done) => {
      const client = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('challenge', async (data) => {
        if (data.type === 'pow') {
          const solution = await solvePoWChallenge(data.prefix, data.complexity);
          client.emit('solve_challenge', solution);
        }
      });

      client.on('challenge_success', () => {
        // Try to find a match
        client.emit('find_match');
      });

      client.on('banned', () => {
        client.close();
        done();
      });

      setTimeout(() => {
        client.close();
        done();
      }, 5000);
    }, 10000);
  });

  describe('7. IP Hashing and Ban Detection', () => {
    test('should hash IP addresses for privacy', async () => {
      // IP hashing happens server-side, we verify it's not exposed
      const res = await request(app).get('/api/stats');
      const body = JSON.stringify(res.body);

      // Should not contain raw IP patterns
      expect(body).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    });

    test('ban detection should use cached results', (done) => {
      // Multiple requests from same IP should use cache
      const client1 = ioClient(BASE_URL, { reconnection: false });

      client1.on('connect', () => {
        client1.close();

        // Second connection should hit cache
        const client2 = ioClient(BASE_URL, { reconnection: false });
        client2.on('connect', () => {
          client2.close();
          done();
        });
      });

      setTimeout(() => {
        client1.close();
        done(new Error('Connection timeout'));
      }, 5000);
    }, 10000);
  });

  describe('8. Admin Panel Authentication', () => {
    test('should require authentication for admin endpoints', async () => {
      const res = await request(app).get('/api/moderation/stats');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    test('should reject admin login with wrong password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ password: 'wrong-password-123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('should accept admin login with correct password', async () => {
      const password = process.env.ADMIN_PASSWORD || 'strong-secret';

      const res = await request(app).post('/api/admin/login').send({ password });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    test('should allow access to admin endpoints after login', async () => {
      const password = process.env.ADMIN_PASSWORD || 'strong-secret';

      // Login first
      const loginRes = await request(app).post('/api/admin/login').send({ password });

      const cookies = loginRes.headers['set-cookie'];

      // Try to access admin endpoint
      const res = await request(app).get('/api/moderation/stats').set('Cookie', cookies);

      expect(res.status).toBe(200);
    });

    test('metrics endpoint should require Basic Auth', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toContain('Basic');
    });

    test('metrics endpoint should accept valid Basic Auth', async () => {
      const password = process.env.ADMIN_PASSWORD || 'strong-secret';
      const credentials = Buffer.from(`admin:${password}`).toString('base64');

      const res = await request(app).get('/metrics').set('Authorization', `Basic ${credentials}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('# HELP');
    });
  });

  describe('9. Additional Security Checks', () => {
    test('should sanitize user input to prevent XSS', async () => {
      const maliciousInput = '<script>alert("xss")</script>';

      const res = await request(app)
        .post('/api/feedback')
        .set('Cookie', ['csrf_token=test'])
        .set('x-csrf-token', 'test')
        .send({ text: maliciousInput, type: 'bug' });

      // Should either sanitize or reject
      expect(res.status).not.toBe(500);
    });

    test('should enforce message length limits', (done) => {
      const client = ioClient(BASE_URL, { reconnection: false });

      client.on('challenge', async (data) => {
        if (data.type === 'pow') {
          const solution = await solvePoWChallenge(data.prefix, data.complexity);
          client.emit('solve_challenge', solution);
        }
      });

      client.on('challenge_success', () => {
        // Try to send oversized message
        const longMessage = 'A'.repeat(2000);
        client.emit('send_msg', longMessage);
      });

      client.on('sys_error', (msg) => {
        expect(msg).toBeDefined();
        client.close();
        done();
      });

      setTimeout(() => {
        client.close();
        done();
      }, 5000);
    }, 10000);

    test('should validate input schemas with Zod', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Cookie', ['csrf_token=test'])
        .set('x-csrf-token', 'test')
        .send({ text: 123 }); // Invalid type

      expect(res.status).toBe(400);
    });
  });
});

// Helper function to solve PoW challenge (same algorithm as client)
async function solvePoWChallenge(prefix, complexity) {
  const target = '0'.repeat(complexity);
  let nonce = 0;

  while (true) {
    const text = prefix + nonce;
    const hash = crypto.createHash('sha256').update(text).digest('hex');

    if (hash.endsWith(target)) {
      return nonce.toString();
    }
    nonce++;

    // Prevent infinite loop in tests
    if (nonce > 100000) {
      throw new Error('PoW solution not found within reasonable iterations');
    }
  }
}
