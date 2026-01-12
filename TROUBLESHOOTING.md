# Troubleshooting

This guide covers common STRNGR issues in dev and production.

---

## 1) App loads but chat never connects

**Symptoms**

- “Connecting…” forever
- No socket events

**Fix**

- Ensure server is running and reachable from client.
- Check reverse proxy websocket support (Nginx must pass upgrade headers).
- Verify the client points to the correct server origin/URL.

**Nginx required bits**

- `proxy_set_header Upgrade $http_upgrade;`
- `proxy_set_header Connection "upgrade";`

---

## 2) PoW challenge fails / clients can’t connect

**Symptoms**

- Socket connect rejected after handshake.

**Fix**

- Confirm client includes `pow.js` logic and it is executed before connection.
- Ensure crypto API works (HTTPS is required for `crypto.subtle` in most browsers).
- If testing locally, use `localhost` (secure context) or HTTPS dev certs.

---

## 3) Admin login works but API calls fail (401/403)

**Fix**

- Ensure cookie is being sent (check `credentials: 'include'` in fetch calls).
- If using tokens, confirm `Authorization` header is set.
- Check proxy is not stripping auth headers or cookies.
- **CSRF Token**: Ensure `x-csrf-token` header is included in POST/PUT/DELETE requests. Read it from the `csrf_token` cookie.

---

## 4) CSS looks broken in production build

Likely PurgeCSS removed dynamic classes.

**Fix**

- Add missing dynamic selectors to PurgeCSS safelist in `postcss.config.js`.
- Rebuild and verify.

---

## 5) PWA not installable

Checklist:

- Valid `manifest.json` (name, icons, start_url, display).
- Service worker registered (successful `sw.js` registration in console).
- Served over HTTPS (or localhost).
- No mixed content errors.

---

## 6) `/metrics` returns 401

Expected. It’s protected by Basic Auth.

**Fix**

- Use configured credentials (`admin` as user, `ADMIN_PASSWORD` as password).
- Confirm reverse proxy passes `Authorization` header.

---

## 7) SQLite “database is locked”

**Fix**

- Ensure WAL mode is enabled (`PRAGMA journal_mode = WAL`).
- Avoid long transactions.
- Check if you are running multiple server instances pointing at the same SQLite file without a proper sharing mechanism.

---

## 8) High CPU under bot load

**Fix**

- Verify PoW is enabled for socket connections.
- Increase rate limits in `src/server.js`.
- Consider temporarily increasing PoW difficulty (`POW_COMPLEXITY`).

---

## 9) Builds fail on Windows paths

**Fix**

- Use Node 18+ and a modern npm.
- Avoid spaces in directory paths.
- Delete `node_modules` + reinstall if dependency tree breaks:
  - `rm -rf node_modules package-lock.json && npm i`

---

## 10) Compression files generated but not served

**Fix**

- Vite plugin generates `.br` and `.gz` but your server must be configured to serve them.
- If using Nginx, enable `brotli_static on; gzip_static on;`.
- Use a library like `express-static-gzip` if serving via Node.

---

## 11) WebSocket disconnected unexpectedly on Mobile

**Fix**

- Mobile browsers often throttle background tabs.
- Ensure `pingInterval` and `pingTimeout` are tuned (default 25s/20s).
- Use the PWA "Standalone" mode to reduce OS throttling.

---

## 12) Database Corruption or Missing Data

**Fix**

- Check `src/db/backups` for daily snapshots.
- Restore by renaming the latest backup to the name configured in `.env`.
- Ensure the disk has enough space; SQLite can fail silently or corrupt on "Disk Full".

---

## 13) Rate Limit False Positives

**Fix**

- If many users share an IP (e.g., University, Corporate VPN), they might hit the IP-based rate limit.
- Whitelist specific IPs in Nginx or increase the limit in `src/server.js` if necessary.
- Ensure `TRUST_PROXY=true` is set so the server sees the real client IP, not the proxy IP.
