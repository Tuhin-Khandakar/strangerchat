# Security Audit & Hardening Checklist

## 1. Network Security

- [x] **HSTS enforced**: Strict-Transport-Security header is set to 1 year + includeSubDomains + preload.
- [x] **CSP**: Content-Security-Policy is strict. `unsafe-inline` removed from `style-src` (moved to `style-src-attr` for compatibility).
- [x] **X-Frame-Options**: Set to DENY to prevent clickjacking.
- [x] **X-Content-Type-Options**: Set to nosniff.
- [ ] **SSL/TLS**: Ensure production server (Nginx/Heroku/etc) terminates SSL correctly.

## 2. Authentication & Authorization

- [x] **Admin Rate Limiting**: Max 5 attempts per 15 mins for both HTTP and Socket login.
- [x] **Metrics Protection**: `/metrics` endpoint is protected by Basic Auth (Admin credentials).
- [x] **Socket CAPTCHA**: Proof of Work (SHA-256) required for all socket connections to prevent bot floods.
- [x] **Session Cookie**: `httpOnly`, `secure`, `sameSite: strict`.

## 3. Data Validation & Sanitation

- [x] **SQL Injection**: All database queries use prepared statements (`better-sqlite3`).
- [x] **XSS**: User input is sanitized (HTML escaping) before display.
- [x] **Log Injection**: Input length validation added to `/api/logs/*` and `/api/feedback`.
- [x] **Input Validation**: `zod` schemas used for all structured inputs (messages, reports, typing, etc.).

## 4. Feature Hardening

- [x] **Socket.IO**:
  - Rate limiting for connection, messages, typing, finding match.
  - Message length limits enforced.
  - Max HTTP buffer size limited to 10KB.
- [x] **CSRF**: Double Submit Cookie pattern implemented for API.
- [x] **Dependencies**: `npm audit` run - 0 vulnerabilities.

## 5. Ongoing Maintenance (To Do)

- [ ] Regular `npm audit`.
- [ ] Rotate `ADMIN_PASSWORD` periodically.
- [ ] Monitor logs for repeated `401` or `403` errors.
- [ ] Review `banned_words` list regularly.
