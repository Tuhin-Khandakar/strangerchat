---
description: Implement Admin Moderation Phase 1
---

## Phase 1: Admin Moderation (Internal Tools)

### 1. Environment & Auth

- [ ] Add `ADMIN_PASSWORD` to `.env` and `.env.example`.
- [ ] Implement `requireAdmin` middleware in `server.js`.

### 2. Database Schema Updates

- [ ] Update `banned_words` table to include `enabled` (boolean, default 1) and ensure `severity` is integer (1-3).
  - Note: Existing `severity` is text ('medium', 'high'). Need to migrate or start fresh. valid: 1, 2, 3.
  - Migration: `ALTER TABLE banned_words ADD COLUMN enabled INTEGER DEFAULT 1;`

### 3. Server Logic Updates

- [ ] Update `checkMessageAgainstFilter` to return severity.
- [ ] Update `send_msg` handler to respect severity levels:
  - **1**: Block only.
  - **2**: Block + Record Violation.
  - **3**: Block + Instant Ban.

### 4. Admin API Endpoints (`/admin/api/...`)

- [ ] **GET /banned-words**: List all.
- [ ] **POST /banned-words**: Add new (word, severity).
- [ ] **PUT /banned-words/:id**: Update status/severity.
- [ ] **GET /violations**: View recent violations (from `filter_violations` join `user_moderation` meant for aggregation).
- [ ] **GET /bans**: View banned users (`user_moderation` where `banned_until` > now).
- [ ] **POST /bans/:ipHash**: Lift or impose ban.

### 5. Admin UI (`public/admin.html`)

- [ ] Simple single-page HTML/JS.
- [ ] Login overlay (prompts for token, stores in memory/localStorage).
- [ ] Tabs: Words, Violations, Bans.
- [ ] Tables with Actions.

// turbo-all
