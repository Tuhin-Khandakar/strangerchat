# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in STRNGR, please do NOT open a public issue.

Contact us via one of the following:

- **Email**: security@yourdomain.com (Replace with your actual contact)
- **GitHub Private Advisory**: Open a private advisory on the repository.

Please include:

- A detailed description of the vulnerability.
- Steps to reproduce (proof of concept).
- Potential impact.

We aim to acknowledge reports within 72 hours and provide a fix within 14 days for critical issues.

## Implemented Protections

- **CSP (Content Security Policy)**:
  - Restrictive policy via `helmet`.
  - Scripts only allowed from self and trusted CDNs.
  - Style-src includes `unsafe-inline` for dynamic theme support (carefully scoped).
- **CSRF Protection**:
  - Stateless double-submit cookie pattern.
  - Secure, SameSite=Strict cookies for session management.
- **XSS Prevention**:
  - All user-generated content is sanitized using `DOMPurify` (client-side) or equivalent logic.
  - Template-safe DOM insertion (no `innerHTML` for user content).
- **Rate Limiting**:
  - Per-IP limits for logins, chat actions, and API requests using `express-rate-limit`.
  - Exponential backoff for repeated violations.
- **SQL Injection Prevention**:
  - 100% parameterized queries via `better-sqlite3`.
  - No dynamic SQL generation from user input.
- **Bot Defense**:
  - Proof-of-Work (PoW) challenge required for all Socket.IO connections.
  - Prevents mass automated connection attempts.
- **IP & CIDR Banning**:
  - Ability to ban specific IPs or entire CIDR ranges via the Admin Panel.
- **Automated Moderation**:
  - Real-time toxicity scoring via Google Perspective API (optional).
  - Regex-based word filtering with automatic violation recording.

## Production Best Practices

- **Secret Management**: Never commit `.env`. Use environment variables in production.
- **SSL/TLS**: Always serve over HTTPS with modern ciphers.
- **Regular Audits**: Run `npm audit` and `npm update` regularly to patch known vulnerabilities.
- **Least Privilege**: The Node process should not run as root.
- **DB Security**: The SQLite file should be readable/writable only by the application user.
- **Logging**: Security events (failed logins, bans, etc.) are logged with client IP and metadata.
