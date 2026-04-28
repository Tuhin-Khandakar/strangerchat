# StrangerChat 2.0 - Technical Architecture

## System Design Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CDN (Cloudflare)                        │
│                  Static Assets + Edge Cache                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Load Balancer (AWS ALB)                    │
│              Sticky Sessions for Socket.io                  │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
    │ App 1   │     │ App 2   │     │ App 3   │
    │ Node.js │     │ Node.js │     │ Node.js │
    │ + Sock  │     │ + Sock  │     │ + Sock  │
    └────┬────┘     └────┬────┘     └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────┐   ┌────▼─────┐   ┌────▼─────┐
    │PostgreSQL│   │  Redis   │   │Elasticsearch
    │(Primary) │   │(Cache)   │   │(Search)
    └──────────┘   └──────────┘   └──────────┘
```

---

## 1. Frontend Architecture (Next.js + React 18)

### 1.1 Directory Structure
```
frontend/
├── app/
│   ├── layout.tsx              # Root layout + metadata
│   ├── page.tsx                # Landing page (SEO-optimized)
│   ├── chat/
│   │   ├── layout.tsx          # Chat wrapper
│   │   ├── page.tsx            # Main chat interface
│   │   └── [roomId]/page.tsx   # Room details page
│   ├── api/
│   │   ├── auth/route.ts       # Auth endpoints
│   │   ├── socket/route.ts     # Socket upgrade
│   │   └── analytics/route.ts  # Event tracking
│   └── sitemap.xml             # SEO sitemap
├── components/
│   ├── Chat/
│   │   ├── ChatBox.tsx         # Message container
│   │   ├── MessageBubble.tsx   # Message component
│   │   ├── TypingIndicator.tsx # Typing animation
│   │   └── MessageInput.tsx    # Input + send
│   ├── Matching/
│   │   ├── SearchingState.tsx  # Search animation
│   │   ├── MatchAnimation.tsx  # Match confetti
│   │   └── NextButton.tsx      # Next chat button
│   ├── Moderation/
│   │   ├── ReportModal.tsx     # Report form
│   │   ├── SafeMode.tsx        # Content filter toggle
│   │   └── AgeGate.tsx         # 18+ verification
│   ├── Premium/
│   │   ├── PremiumBadge.tsx    # Premium indicator
│   │   ├── PaymentModal.tsx    # Stripe checkout
│   │   └── FeatureComparison.tsx
│   ├── Common/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ToastNotification.tsx
│   └── SEO/
│       ├── Meta.tsx            # Dynamic metadata
│       └── StructuredData.tsx  # JSON-LD
├── hooks/
│   ├── useSocket.ts            # Socket.io hook
│   ├── useChat.ts              # Chat state management
│   ├── useAuth.ts              # Authentication
│   ├── usePremium.ts           # Premium features
│   └── useAnalytics.ts         # Event tracking
├── lib/
│   ├── socket.ts               # Socket.io client config
│   ├── api.ts                  # API client (fetch wrapper)
│   ├── auth.ts                 # Auth utilities
│   ├── moderation.ts           # Client-side content filters
│   └── seo.ts                  # SEO utilities
├── store/
│   └── chatStore.ts            # Zustand state (chat, user, premium)
├── styles/
│   ├── globals.css             # Tailwind + custom CSS
│   ├── animations.css          # Smooth animations
│   └── typography.css          # Font stack
├── public/
│   ├── logo.svg
│   ├── og-image.png            # OG image for social sharing
│   ├── sitemap.xml
│   └── robots.txt
└── next.config.js              # Performance optimization
```

### 1.2 Key Components (Pseudo-code)

#### ChatBox.tsx
```tsx
// Real-time message rendering with optimistic updates
// Features:
// - Virtual scrolling (100K+ messages)
// - Message grouping (same user consecutive)
// - Reaction support (emoji reactions)
// - Auto-scroll-to-bottom with user control
// - Read receipts (encrypted)
```

#### useSocket Hook
```tsx
// Manages Socket.io lifecycle
// Features:
// - Auto-reconnect with exponential backoff
// - Event deduplication (prevents duplicate messages)
// - Offline queue (buffer messages, send when online)
// - Connection state management
// - Error recovery
```

### 1.3 Performance Optimizations
- **Code Splitting**: Route-based (chat, premium, settings)
- **Image Optimization**: Next.js Image with AVIF/WebP
- **Lazy Loading**: Intersection Observer for modals
- **Bundle Size**: <150KB gzipped (target)
- **Animations**: GPU-accelerated (transform, opacity only)

---

## 2. Backend Architecture (Node.js + Express)

### 2.1 Directory Structure
```
backend/
├── src/
│   ├── server.ts               # App entry point
│   ├── socket/
│   │   ├── handlers/
│   │   │   ├── chat.handler.ts      # Message events
│   │   │   ├── matching.handler.ts  # Find match, skip
│   │   │   ├── report.handler.ts    # Reporting
│   │   │   └── presence.handler.ts  # Online status
│   │   └── middlewares/
│   │       ├── auth.middleware.ts   # JWT verification
│   │       ├── rate-limit.middleware.ts
│   │       └── moderation.middleware.ts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── premium.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   └── admin.routes.ts
│   │   └── controllers/
│   │       ├── auth.controller.ts
│   │       ├── user.controller.ts
│   │       └── payment.controller.ts
│   ├── services/
│   │   ├── matching.service.ts      # ML-based matching
│   │   ├── moderation.service.ts    # AI content filtering
│   │   ├── auth.service.ts          # JWT + session
│   │   ├── user.service.ts
│   │   ├── payment.service.ts       # Stripe integration
│   │   ├── analytics.service.ts     # Event tracking
│   │   └── notification.service.ts  # Email/SMS
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── session.model.ts
│   │   ├── report.model.ts
│   │   ├── premium.model.ts
│   │   └── event.model.ts
│   ├── queues/
│   │   ├── moderation.queue.ts      # Content scanning
│   │   ├── email.queue.ts           # Email dispatch
│   │   └── analytics.queue.ts       # Event aggregation
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── hash.ts                  # IP hashing
│   │   ├── encryption.ts            # E2E messaging
│   │   └── logger.ts
│   └── config/
│       ├── database.ts
│       ├── redis.ts
│       ├── stripe.ts
│       └── constants.ts
├── migrations/
│   ├── 001_initial_schema.ts
│   └── 002_add_indexes.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docker-compose.yml          # Local dev stack
```

### 2.2 Database Schema (PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash VARCHAR(64) UNIQUE NOT NULL,
    interests TEXT[] DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50),
    is_premium BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP,
    status VARCHAR(20) DEFAULT 'online', -- online, away, offline
    INDEX idx_interests_gin (interests),
    INDEX idx_last_seen (last_seen)
);

-- Sessions Table (Chat rooms)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES users(id),
    user2_id UUID NOT NULL REFERENCES users(id),
    start_at TIMESTAMP DEFAULT NOW(),
    end_at TIMESTAMP,
    duration_seconds INTEGER,
    rating_by_user1 INTEGER, -- 1-5 stars
    rating_by_user2 INTEGER,
    is_reported BOOLEAN DEFAULT FALSE,
    report_reason VARCHAR(100),
    INDEX idx_user1 (user1_id),
    INDEX idx_user2 (user2_id),
    INDEX idx_start_at (start_at DESC)
);

-- Messages Table (Session-scoped)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    is_moderated BOOLEAN DEFAULT FALSE,
    moderation_score FLOAT, -- 0-1 (toxicity)
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_session (session_id),
    INDEX idx_created_at (created_at DESC)
);

-- Reports Table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_user_id UUID NOT NULL REFERENCES users(id),
    session_id UUID NOT NULL REFERENCES sessions(id),
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    evidence JSONB, -- screenshot URLs, logs
    action_taken VARCHAR(50), -- warn, temp_ban, perm_ban
    action_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_reported_user (reported_user_id),
    INDEX idx_created_at (created_at DESC)
);

-- Premium Subscriptions
CREATE TABLE premium_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(20), -- active, canceled, expired
    next_billing_date TIMESTAMP,
    created_at TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_stripe_id (stripe_subscription_id)
);

-- Analytics Events
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50), -- chat_start, message_sent, premium_signup
    properties JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    INDEX idx_user_event (user_id, event_type),
    INDEX idx_created_at (created_at DESC)
);
```

### 2.3 Matching Algorithm (ML-Enhanced)

```typescript
// Pseudo-code for intelligent matching
class MatchingService {
  async findMatch(user: User, interests: string[]) {
    // 1. Check for perfect matches (same interests + language + timezone)
    const perfectMatches = await this.db.query(`
      SELECT id FROM users 
      WHERE interests && $1 AND language = $2 
      AND ABS(EXTRACT(HOUR FROM timezone) - $3) < 2
      AND last_seen > NOW() - INTERVAL '5 min'
      LIMIT 10
    `);
    
    if (perfectMatches.length > 0) {
      return this.selectBest(perfectMatches, user);
    }
    
    // 2. Fallback: Interest-based + timezone proximity
    // 3. Fallback: Language + timezone
    // 4. Cold start: Any online user with low match score
    
    // Scoring: (interest_overlap * 0.5) + (timezone_proximity * 0.3) + (freshness * 0.2)
  }
  
  selectBest(candidates, currentUser) {
    // ML model: Predict match compatibility
    // Features: past ratings, interaction patterns, response time
    // Output: Ranking score → select top candidate
    return model.predict(candidates, currentUser);
  }
}
```

### 2.4 Moderation Pipeline (AI-Powered)

```typescript
class ModerationService {
  async scanMessage(text: string): Promise<ModerationResult> {
    // 1. Real-time Perspective API (Google's toxicity detection)
    const perspectiveScore = await this.perspectiveAPI.analyzeText(text);
    
    // 2. Custom NLP filters (CSAM, spam patterns)
    const customFlags = await this.nlpModel.detect(text);
    
    // 3. Keyword + regex filters (hardcoded blocklist)
    const keywordMatch = this.keywordFilter.match(text);
    
    // 4. Decision logic
    if (perspectiveScore.toxicity > 0.8) {
      return { action: 'BLOCK', reason: 'TOXIC' };
    } else if (perspectiveScore.toxicity > 0.5) {
      return { action: 'FLAG', reason: 'REVIEW' };
    } else if (customFlags.csam || customFlags.spam) {
      return { action: 'BLOCK', reason: 'ILLEGAL' };
    }
    
    return { action: 'ALLOW' };
  }
  
  async handleReport(reportData: ReportData) {
    // 1. Store report + evidence in S3
    // 2. Flag user's IP hash
    // 3. Escalate to human moderators if severity > threshold
    // 4. Auto-ban if same user receives 5+ reports in 24hrs
  }
}
```

---

## 3. Realtime Architecture (Socket.io)

### 3.1 Socket Events Map

**Client → Server**
```
find_match                    // Start matchmaking
skip_match / leave_chat       // End session
send_msg(text)               // Send message
typing(isTyping: bool)       // Typing indicator
report_user(reason)          // Report partner
update_interests(interests)  // Update preferences
```

**Server → Client**
```
searching                    // Matchmaking in progress
matched                      // Found partner
receive_msg(text)            // New message from partner
partner_typing(bool)         // Partner typing status
partner_left                 // Partner disconnected
session_ended                // Session timeout (premium limit)
banned(reason)               // User banned
sys_notification(msg)        // System message
```

### 3.2 State Management (Redis)

```
Key: session:{roomId}
Value: {
  user1: { id, socketId, interests },
  user2: { id, socketId, interests },
  createdAt: timestamp,
  messageCount: 0
}

Key: user:{userId}:session
Value: { roomId, startedAt }

Key: matchmaking_queue
Value: [{ userId, interests, socketId }] (sorted set by priority)
```

---

## 4. Performance & Scalability

### 4.1 Horizontal Scaling
- **Stateless API**: All sessions in Redis (can restart without data loss)
- **Sticky Sessions**: ALB routes user to same app instance (Socket.io connection)
- **Auto-scaling**: Kubernetes horizontal pod autoscaler (scale 5-50 instances)

### 4.2 Caching Strategy
- **Redis Cache**: User interests, moderation rules, Premium statuses (TTL: 1hr)
- **CDN**: Static assets, landing page HTML, API responses (TTL: 24hr)
- **Browser Cache**: Service Worker for offline support

### 4.3 Database Optimization
- **Read Replicas**: PostgreSQL streaming replication for analytics queries
- **Partitioning**: Messages table partitioned by session_id (time-range)
- **Indexing**: GIN indexes on interests array, B-tree on foreign keys
- **Connection Pooling**: PgBouncer (min: 10, max: 100 connections)

### 4.4 Bottleneck Prevention
| Component | Limit | Scaling Solution |
|-----------|-------|------------------|
| Socket.io connections | 10K/instance | Add instances, use sticky sessions |
| Matching queue | 5K users | Redis Sorted Set + sharding |
| Message throughput | 100K/sec | Message queue (Bull) + batch processing |
| Moderation latency | <500ms | Caching + async processing |

---

## 5. Security Implementation

### 5.1 Authentication & Authorization
```typescript
// JWT-based auth with refresh tokens
const token = jwt.sign(
  { userId, ipHash, premium: true },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Socket.io auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.userId = decoded.userId;
  next();
});
```

### 5.2 Data Protection
- **IP Hashing**: SHA-256 (salted) for user identification
- **E2E Encryption**: Optional message encryption (TweetNaCl.js)
- **HTTPS/TLS**: All traffic encrypted in transit
- **GDPR Compliance**: Data deletion after 30 days (unless reported)

### 5.3 DDoS & Rate Limiting
```typescript
// Per-IP rate limit
const limiter = rateLimit({
  windowMs: 60000,
  max: 100, // 100 requests per min
  keyGenerator: (req) => getIpHash(req),
  skip: (req) => req.user?.premium // Premium users exempt
});

// Per-socket event limiting
socket.on('send_msg', throttle(handler, 500)); // Min 500ms between messages
```

---

## 6. Monitoring & Observability

### 6.1 Key Metrics (DataDog)
- **Latency**: P99 message delivery <100ms, match time <2sec
- **Throughput**: Messages/sec, concurrent sessions
- **Error Rate**: <0.1% socket disconnections, <0.5% API errors
- **Resource Usage**: CPU <60%, Memory <80%, Disk <70%

### 6.2 Logging
```typescript
// Structured logging (Winston)
logger.info('User matched', {
  userId: user.id,
  partnerId: partner.id,
  matchTime: Date.now() - startTime,
  interests: user.interests
});

// Error tracking (Sentry)
Sentry.captureException(error, {
  tags: { component: 'matching', severity: 'high' }
});
```

---

## 7. Deployment Pipeline (CI/CD)

### 7.1 GitHub Actions Workflow
```yaml
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run build
  
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: docker build -t strangerchat:${{ github.sha }} .
      - run: docker push ghcr.io/strangerchat/app:latest
      - run: kubectl rollout restart deployment/strangerchat
```

### 7.2 Docker Setup
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm ci --only=production
COPY src/ src/
EXPOSE 3000
CMD ["node", "src/server.ts"]
```

---

**Last Updated**: 2026-01-16  
**Owner**: Engineering Team  
**Version**: 1.0
