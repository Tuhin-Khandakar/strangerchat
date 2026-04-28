# StrangerChat 2.0 - Testing Strategy & QA Runbook

## 1. TEST PYRAMID & COVERAGE TARGETS

```
          /\
         /  \        Integration Tests (30%)
        /    \       - API endpoints
       /      \      - Socket.io events
      /_______ \     - Database transactions
     /          \
    / Unit Tests \   Unit Tests (50%)
   /  (50%)      \   - Utils functions
  /________________\ - Services
                     - Validators
                     
   E2E Tests (20%)
   - User flows
   - Payment
   - Moderation
```

**Coverage Target: 85%+ lines, 90%+ branches**

---

## 2. UNIT TESTS (Backend)

### 2.1 Moderation Service Tests

```typescript
// src/__tests__/services/moderation.test.ts

import { ModerationService } from '@/services/moderation.service';

describe('ModerationService', () => {
  let service: ModerationService;

  beforeEach(() => {
    service = new ModerationService();
  });

  describe('scanMessage', () => {
    it('should BLOCK messages with high toxicity score', async () => {
      const result = await service.scanMessage('I hate you, you stupid idiot');
      expect(result.action).toBe('BLOCK');
      expect(result.reason).toBe('TOXIC');
    });

    it('should BLOCK messages with banned keywords', async () => {
      const result = await service.scanMessage('Buy viagra online now!');
      expect(result.action).toBe('BLOCK');
      expect(result.reason).toBe('BLOCKED_KEYWORD');
    });

    it('should FLAG messages with multiple URLs', async () => {
      const result = await service.scanMessage(
        'Check these out: http://spam1.com http://spam2.com http://spam3.com'
      );
      expect(result.action).toBe('FLAG');
    });

    it('should ALLOW clean messages', async () => {
      const result = await service.scanMessage('Hey! How are you doing today?');
      expect(result.action).toBe('ALLOW');
    });

    it('should sanitize HTML/XSS attempts', async () => {
      const result = await service.scanMessage('<script>alert("xss")</script>');
      expect(result.action).toBe('BLOCK');
    });

    it('should handle empty/whitespace messages', async () => {
      const result = await service.scanMessage('   ');
      expect(result.action).toBe('BLOCK');
    });
  });

  describe('edge cases', () => {
    it('should handle unicode and emoji safely', async () => {
      const result = await service.scanMessage('Hello 👋 你好 مرحبا');
      expect(result.action).toBe('ALLOW');
    });

    it('should timeout gracefully if API fails', async () => {
      jest.spyOn(service, 'scanMessage').mockImplementationOnce(() => 
        Promise.reject(new Error('API timeout'))
      );
      // Should fail-open (ALLOW) rather than crash
    });
  });
});
```

### 2.2 Matching Service Tests

```typescript
describe('MatchingService', () => {
  let service: MatchingService;

  describe('findMatch', () => {
    it('should match users with identical interests', () => {
      const user1 = {
        interests: ['gaming', 'crypto'],
        language: 'en',
        timezone: '0'
      };
      const user2 = {
        interests: ['gaming', 'crypto'],
        language: 'en',
        timezone: '1'
      };

      const score = service.scoreMatch(user1, user2);
      expect(score).toBeGreaterThan(0.8); // High score
    });

    it('should prioritize language match', () => {
      const user1 = { interests: ['music'], language: 'en', timezone: '0' };
      const user2a = { interests: ['music'], language: 'en', timezone: '5' };
      const user2b = { interests: [], language: 'es', timezone: '0' };

      const score1 = service.scoreMatch(user1, user2a);
      const score2 = service.scoreMatch(user1, user2b);

      expect(score1).toBeGreaterThan(score2);
    });

    it('should return null if no candidates in queue', () => {
      const result = service.findMatch(user1, []);
      expect(result).toBeNull();
    });
  });
});
```

### 2.3 Auth Service Tests

```typescript
describe('AuthService', () => {
  describe('JWT token generation', () => {
    it('should create valid JWT with user claims', () => {
      const token = authService.generateToken({
        userId: 'user-123',
        isPremium: true
      });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe('user-123');
      expect(decoded.isPremium).toBe(true);
    });

    it('should set 15-minute expiry', () => {
      const token = authService.generateToken({ userId: 'user-123' });
      const decoded: any = jwt.decode(token);

      const expiryTime = (decoded.exp - decoded.iat) * 1000;
      expect(expiryTime).toBe(15 * 60 * 1000); // 15 min in ms
    });

    it('should reject expired tokens', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      expect(() => jwt.verify(expiredToken, process.env.JWT_SECRET))
        .toThrow('jwt expired');
    });
  });

  describe('refresh token flow', () => {
    it('should issue new token from valid refresh token', () => {
      const refreshToken = authService.generateRefreshToken('user-123');
      const newToken = authService.refreshToken(refreshToken);

      expect(newToken).toBeDefined();
      const decoded: any = jwt.decode(newToken);
      expect(decoded.userId).toBe('user-123');
    });
  });
});
```

---

## 3. INTEGRATION TESTS (API)

### 3.1 Chat Flow Integration

```typescript
// tests/integration/chat-flow.test.ts

describe('Chat Flow Integration', () => {
  let user1: { socket: Socket; userId: string };
  let user2: { socket: Socket; userId: string };
  let pool: Database.Pool;

  beforeAll(async () => {
    pool = await createTestDatabase();
    await setupTestServer();
  });

  afterEach(async () => {
    await pool.query('TRUNCATE sessions, messages, users CASCADE');
  });

  it('should complete full chat session: match → chat → disconnect', async () => {
    // 1. User 1 connects and finds match
    user1 = await connectUser({ interests: ['gaming'] });
    const searchPromise = new Promise(resolve =>
      user1.socket.on('searching', resolve)
    );
    user1.socket.emit('find_match', { interests: ['gaming'] });
    await searchPromise;

    // 2. User 2 connects and gets matched
    user2 = await connectUser({ interests: ['gaming'] });
    const matchPromise = Promise.all([
      new Promise(resolve => user1.socket.on('matched', resolve)),
      new Promise(resolve => user2.socket.on('matched', resolve))
    ]);
    user2.socket.emit('find_match', { interests: ['gaming'] });
    await matchPromise;

    // 3. Users exchange messages
    const receivePromise = new Promise(resolve =>
      user2.socket.on('receive_msg', resolve)
    );
    user1.socket.emit('send_msg', 'Hey! How are you?');
    const msg = await receivePromise;
    expect(msg.text).toBe('Hey! How are you?');

    // 4. Verify messages in database
    const result = await pool.query(
      'SELECT * FROM messages WHERE session_id = (SELECT id FROM sessions WHERE user1_id = $1)',
      [user1.userId]
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].text).toBe('Hey! How are you?');

    // 5. User disconnects
    const leftPromise = new Promise(resolve =>
      user2.socket.on('partner_left', resolve)
    );
    user1.socket.disconnect();
    await leftPromise;

    // 6. Verify session ended in DB
    const sessionResult = await pool.query(
      'SELECT end_at FROM sessions WHERE user1_id = $1',
      [user1.userId]
    );
    expect(sessionResult.rows[0].end_at).not.toBeNull();
  });

  it('should handle message rate limiting', async () => {
    // Setup match
    await setupMatch(user1, user2);

    // Rapid messages
    const results = [];
    for (let i = 0; i < 5; i++) {
      const receivePromise = new Promise(resolve => {
        const timeout = setTimeout(() => resolve(null), 500);
        user2.socket.on('receive_msg', () => {
          clearTimeout(timeout);
          resolve(true);
        });
      });
      user1.socket.emit('send_msg', `Message ${i}`);
      results.push(await receivePromise);
    }

    // Only every 3rd message (300ms apart) should go through
    const successCount = results.filter(r => r === true).length;
    expect(successCount).toBeLessThan(5);
  });

  it('should prevent messaging after session ends', async () => {
    await setupMatch(user1, user2);
    user1.socket.disconnect();

    // Try to send after disconnect
    const errorPromise = new Promise(resolve =>
      user1.socket.on('sys_error', resolve)
    );

    // This should be rejected (message not received)
    user1.socket.emit('send_msg', 'Should fail');
    
    // No error on client (they're disconnected anyway)
    // Just verify message never reaches user2
    expect(user2.lastReceivedMsg).not.toBe('Should fail');
  });
});
```

### 3.2 Moderation Flow Integration

```typescript
describe('Moderation Flow Integration', () => {
  it('should auto-block toxic messages from being delivered', async () => {
    await setupMatch(user1, user2);

    const mockModeration = jest.spyOn(
      ModerationService.prototype,
      'scanMessage'
    ).mockResolvedValueOnce({ action: 'BLOCK', reason: 'TOXIC' });

    user1.socket.emit('send_msg', 'I hate you!');

    // User 1 gets error
    const errorMsg = await new Promise(resolve =>
      user1.socket.on('sys_error', resolve)
    );
    expect(errorMsg).toContain('blocked by filter');

    // User 2 never receives it
    await sleep(100);
    expect(user2.lastReceivedMsg).not.toBe('I hate you!');
  });

  it('should flag messages for review and allow delivery', async () => {
    await setupMatch(user1, user2);

    const mockModeration = jest.spyOn(
      ModerationService.prototype,
      'scanMessage'
    ).mockResolvedValueOnce({ action: 'FLAG', reason: 'REVIEW' });

    user1.socket.emit('send_msg', 'this is mildly suspicious');

    // Message goes through
    const received = await new Promise(resolve =>
      user2.socket.on('receive_msg', resolve)
    );
    expect(received.text).toBe('this is mildly suspicious');

    // But marked in DB for review
    const msg = await pool.query(
      'SELECT * FROM messages WHERE text = $1',
      ['this is mildly suspicious']
    );
    expect(msg.rows[0].is_moderated).toBe(true);
    expect(msg.rows[0].moderation_score).toBeGreaterThan(0);
  });

  it('should ban user after 5 reports', async () => {
    const reporter = await connectUser();
    const reported = await connectUser();
    await setupMatch(reporter, reported);

    // Submit 5 reports
    for (let i = 0; i < 5; i++) {
      reporter.socket.emit('report_user', { reason: 'Spam' });
      await sleep(100);
    }

    // Verify user is banned in DB
    const banResult = await pool.query(
      'SELECT banned_until FROM user_moderation WHERE ip_hash = $1',
      [reported.ipHash]
    );
    expect(banResult.rows[0].banned_until).toBeDefined();
    expect(banResult.rows[0].banned_until).toBeGreaterThan(Date.now());

    // Banned user can't connect
    const bannedSocket = connectUser({ ipHash: reported.ipHash });
    await expect(bannedSocket).rejects.toThrow('banned');
  });
});
```

### 3.3 Premium Features Integration

```typescript
describe('Premium Subscription Flow', () => {
  it('should extend session duration for premium users', async () => {
    const premiumUser = await connectUser({ isPremium: true });
    const freeUser = await connectUser({ isPremium: false });
    await setupMatch(premiumUser, freeUser);

    // Premium limit: 60 min (3,600,000ms)
    // Free limit: 20 min (1,200,000ms)
    const matchedAt = Date.now();

    // Simulate time passing
    jest.useFakeTimers();
    jest.advanceTimersByTime(25 * 60 * 1000); // 25 min

    // Premium user still connected
    expect(premiumUser.isConnected).toBe(true);

    // Free user would be kicked (simulated)
    jest.advanceTimersByTime(36 * 60 * 1000); // Total 61 min
    // (In real scenario, server would disconnect free user)
  });

  it('should grant 7-day premium from referral', async () => {
    const user = { id: 'user-new' };

    // Signup with referral code
    const result = await axios.post('/api/auth/signup', {
      referralCode: 'ABC123'
    });

    // Verify premium granted
    const subscription = await pool.query(
      'SELECT status, next_billing_date FROM premium_subscriptions WHERE user_id = $1',
      [user.id]
    );

    expect(subscription.rows[0].status).toBe('active');
    const daysUntilExpiry = (
      subscription.rows[0].next_billing_date - Date.now()
    ) / (24 * 60 * 60 * 1000);
    expect(daysUntilExpiry).toBeCloseTo(7, 0);
  });
});
```

---

## 4. END-TO-END (E2E) TESTS

### 4.1 Cypress Tests (User Workflows)

```typescript
// cypress/e2e/chat-flow.cy.ts

describe('Complete Chat Flow (E2E)', () => {
  beforeEach(() => {
    cy.visit('https://strangerchat.com');
  });

  it('should match and chat between two users', () => {
    // User 1: Accept terms and start
    cy.contains('I am 18+').click();
    cy.get('#start-btn').click();
    cy.contains('Looking for someone').should('be.visible');

    // In parallel (Cypress can't do true parallel, so we'll simulate)
    // User 2 would open in another window
    // For now, we'll test the full flow on one

    // Wait for match (up to 5 sec)
    cy.contains('matched', { timeout: 5000 }).should('be.visible');

    // Type and send message
    cy.get('textarea').type('Hey there!');
    cy.contains('Send').click();

    // Verify message appears in chat
    cy.contains('You: Hey there!').should('be.visible');

    // Next button functionality
    cy.contains('Next').click();
    cy.contains('Looking for someone').should('be.visible');
  });

  it('should prevent banned users from chatting', () => {
    // Simulate banned IP (in test DB, mark IP as banned)
    const bannedIp = '192.168.1.100';
    cy.loginAs(bannedIp);

    cy.contains('I am 18+').click();
    cy.get('#start-btn').should('be.disabled');
    cy.contains('You have been banned').should('be.visible');
  });

  it('should upgrade user to premium via Stripe', () => {
    cy.contains('I am 18+').click();
    cy.get('#start-btn').click();

    // Look for premium upgrade link
    cy.contains('Upgrade to Premium').click();
    
    // Should redirect to pricing/Stripe
    cy.url().should('include', 'stripe.com');
    
    // Simulate successful payment
    cy.fillStripeForm({
      cardNumber: '4242424242424242',
      expiry: '12/25',
      cvc: '123'
    });
    cy.contains('Pay').click();

    // Should redirect back to app
    cy.url().should('include', 'strangerchat.com');
    cy.contains('Premium unlocked!').should('be.visible');
  });
});
```

### 4.2 Playwright Performance Tests

```typescript
// tests/e2e/performance.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks', () => {
  test('homepage should load in < 2.5s (LCP)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('https://strangerchat.com');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2500);
  });

  test('chat initiation should be < 2 seconds', async ({ page }) => {
    await page.goto('https://strangerchat.com/chat');
    await page.check('[id="tos-check"]');

    const startTime = Date.now();
    await page.click('[id="start-btn"]');
    await page.waitForSelector('[id="chat-box"]');

    const matchTime = Date.now() - startTime;
    expect(matchTime).toBeLessThan(2000);
  });

  test('message send/receive latency < 100ms', async ({ context }) => {
    // Create two browser contexts (simulating two users)
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Setup match
    await setupMatch(page1, page2);

    const startTime = Date.now();
    await page1.fill('textarea', 'Test message');
    await page1.click('[id="send-btn"]');

    // Wait for message to appear on page2
    await page2.waitForSelector('text=Test message', { timeout: 500 });
    const latency = Date.now() - startTime;

    expect(latency).toBeLessThan(100);
  });
});
```

---

## 5. LOAD TESTING

### 5.1 K6 Load Test Script

```javascript
// tests/load/chat-load.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const matchLatency = new Trend('match_latency');

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 500 },  // Hold at 500
    { duration: '2m', target: 1000 }, // Spike
    { duration: '5m', target: 500 },  // Cool down
    { duration: '1m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{staticAsset:yes}': ['p(99)<100'],
    errors: ['rate<0.1'] // Error rate < 10%
  }
};

export default function() {
  group('chat_flow', () => {
    // 1. Connect to socket
    let res = http.get(
      'wss://api.strangerchat.com/socket.io/?transport=websocket'
    );

    // 2. Emit find_match
    const startTime = Date.now();
    res = http.post(
      'https://api.strangerchat.com/socket',
      {
        event: 'find_match',
        interests: ['gaming']
      }
    );

    const matchTime = Date.now() - startTime;
    matchLatency.add(matchTime);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'match found': (r) => r.body.includes('matched')
    }) || errorRate.add(1);

    sleep(5);

    // 3. Send message
    res = http.post(
      'https://api.strangerchat.com/socket',
      {
        event: 'send_msg',
        text: 'Hey!'
      }
    );

    check(res, {
      'message sent': (r) => r.status === 200
    }) || errorRate.add(1);

    sleep(3);
  });
}
```

**Run locally:**
```bash
k6 run tests/load/chat-load.js --vus 100 --duration 30s
```

---

## 6. SECURITY TESTING

### 6.1 OWASP Top 10 Checks

```
[] XSS Prevention
   - HTML entities in messages ✓
   - DOM-based XSS in client ✓
   - CSP headers enforced ✓

[] SQL Injection
   - Parameterized queries ✓
   - No string concatenation ✓

[] CSRF Protection
   - SameSite=Strict cookies ✓
   - CSRF token validation ✓

[] Authentication
   - JWT signing verified ✓
   - Refresh token rotation ✓
   - Password hashing (bcrypt) ✓

[] Data Exposure
   - HTTPS enforced ✓
   - Sensitive data not in logs ✓
   - IP hashing (not storing raw) ✓

[] Rate Limiting
   - Per-IP: 100 req/min ✓
   - Per-socket: 1 msg/300ms ✓
   - Per-user: 5 reports/hour ✓
```

### 6.2 Penetration Test Checklist

- [ ] API authentication bypass
- [ ] WebSocket protocol hijacking
- [ ] SQL injection in queries
- [ ] Path traversal vulnerabilities
- [ ] CORS misconfiguration
- [ ] Sensitive data exposure
- [ ] Session fixation attacks

---

## 7. QA SIGN-OFF CHECKLIST

### 7.1 Functional Testing

- [ ] User signup flow
- [ ] Chat matching algorithm
- [ ] Message sending/receiving
- [ ] Typing indicators
- [ ] Report functionality
- [ ] Ban system
- [ ] Premium features
- [ ] Payment flow (Stripe)
- [ ] Referral system
- [ ] Email notifications

### 7.2 Non-Functional Testing

- [ ] Performance (LCP < 2.5s)
- [ ] Load (1000 concurrent users)
- [ ] Security (OWASP A01-A10)
- [ ] Compliance (GDPR, CCPA)
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

### 7.3 Production Readiness

- [ ] Uptime SLA 99.95%
- [ ] Error monitoring (Sentry)
- [ ] Performance monitoring (DataDog)
- [ ] Backup & disaster recovery
- [ ] Incident response plan
- [ ] Database indexes optimized
- [ ] CDN caching configured
- [ ] Load balancer configured

---

**Last Updated**: 2026-01-16  
**Owner**: QA / Engineering  
**Version**: 1.0
