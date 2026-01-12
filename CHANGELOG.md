# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-11

### Added

- **Production Preparedness**:
  - Complete documentation suite (README, API, Runbook, etc.).
  - Monitoring via Prometheus and structured logging.
  - Client-side error and performance reporting.
- **Security & Stability**:
  - Proof-of-Work (PoW) connection handshake.
  - SQLite backend with WAL mode and automated backups.
  - Rate limiting and CIDR range banning.
  - Content Security Policy (CSP) and HSTS.
- **PWA Enhancements**:
  - Full offline support with `sw.js`.
  - Push notification integration.
  - Installable across all platforms.
- **UI/UX**:
  - Glassmorphism design system.
  - Multi-theme support (Light, Dark, Midnight).
  - Accessibility (ARIA roles, keyboard nav, screen reader cues).

### Fixed

- PostCSS configuration compatibility issues with PurgeCSS v7.
- Missing dependencies (`basic-auth`, `web-push`, etc.).
- Robust socket reconnection logic and session restoration.

---

## [0.5.0] - 2025-12-15

### Added

- Original modular chat logic.
- Basic Socket.IO pairing.
- Static HTML structure.
