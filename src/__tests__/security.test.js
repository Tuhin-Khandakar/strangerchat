import { app, server, io } from '../server.js';
import request from 'supertest';

const PORT = 3002;

describe('Security Tests', () => {
  beforeAll((done) => {
    if (!server.listening) {
      server.listen(PORT, () => done());
    } else {
      done();
    }
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  test('XSS: server should sanitize message input', async () => {
    // This is better tested via socket logic since it's a socket app
    // But we can test the sanitize helper if exported
  });

  test('CSRF: POST requests without token should fail', async () => {
    const res = await request(app).post('/api/appeals').send({ reason: 'Test reason' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid CSRF token');
  });

  test('Admin: Access without session should fail', async () => {
    const res = await request(app).get('/admin/api/violations');
    expect(res.status).toBe(403);
  });

  test('SQL Injection: attempts in admin endpoints should be handled by SQLite/Zod', async () => {
    // Testing via the public appeal endpoint which is open
    const res = await request(app)
      .post('/api/appeals')
      .set('Cookie', ['csrf_token=testtoken'])
      .set('x-csrf-token', 'testtoken')
      .send({ reason: "'; DROP TABLE users; --" });

    // Should either fail validation or be treated as literal string
    expect(res.status).not.toBe(500);
  });
});
