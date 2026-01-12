# Deployment Guide

This document describes production deployment patterns for STRNGR.

---

## Environments

### Development

- Vite dev server (`npm run dev`) + Node server.
- Express on 3000, Vite on 5173 (proxied).

### Staging

- Same as prod, separate DB and domain.
- Full observability enabled for pre-release testing.

### Production

- HTTPS only (Required for PWA and Audio context).
- Reverse proxy (Nginx recommended).
- Backups + monitoring required.

---

## Required Environment Variables

See `.env.example`. Minimum production set:

- `NODE_ENV=production`
- `PORT=3000`
- `ADMIN_PASSWORD=...` (Min 12 characters, high complexity).
- `ALLOWED_ORIGINS=https://yourdomain.com`
- `PERSPECTIVE_API_KEY=...` (optional Google Perspective API key).
- `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY` (for Push Notifications).
- `TRUST_PROXY=true` (Required if behind Nginx/Cloudflare).
- `PUBLIC_URL=https://yourdomain.com` (Used for PWA and links).

---

## Production Deployment Checklist

### 1. Environment & Infrastructure

- [ ] `NODE_ENV` is set to `production`.
- [ ] All required secrets are set in the environment (not in code).
- [ ] SSL certificate is active (Managed via Certbot/LetsEncrypt).
- [ ] Reverse proxy (Nginx) is configured for Websockets.
- [ ] `TRUST_PROXY` is set to `true`.

### 2. Security

- [ ] `ADMIN_PASSWORD` is unique and strong.
- [ ] HSTS is enabled (handled by Helmet in code, or Nginx).
- [ ] CSP is configured for your domain and any external CDNs.
- [ ] Rate limiting is active on all endpoints.

### 3. Monitoring & Observability

- [ ] Prometheus `/metrics` endpoint is protected.
- [ ] Log aggregation is set up (e.g., Loki, ELK, or basic PM2 logs).
- [ ] Error reporting emails or Slack alerts are configured.
- [ ] Health check endpoint (`/api/health`) is monitored.

### 4. Backups

- [ ] Automated daily backup of `src/db/chat.db`.
- [ ] Backups are moved to a separate physical location/cloud storage.
- [ ] Restoration procedure has been tested.

### 5. PWA & Assets

- [ ] Vite build is executed with `npm run build`.
- [ ] `dist/` folder is served by Nginx or static server.
- [ ] Service worker is registered and working offline.
- [ ] Manifest file is correctly served.

---

## Recommended: Nginx Reverse Proxy

Example site config:

```nginx
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  # SSL config (Managed via Certbot/LetsEncrypt)
  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";

  # Serve static build folder
  root /var/www/strngr/dist;
  index index.html;

  # Prefer brotli/gzip static assets
  brotli_static on;
  gzip_static on;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy API + Sockets to Node.js
  location /socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /metrics {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

---

## Process Manager (PM2)

Deploy and keep the Node server running:

```bash
npm i -g pm2
npm run build
pm2 start src/server.js --name "strngr-app"
pm2 save
pm2 startup
```

---

## Docker Deployment (Docker Compose Recommended)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    volumes:
      - ./data:/app/src/db
    env_file: .env
    restart: always
```

---

## Caching Strategy

- **Static Assets** (JS/CSS/Images in `assets/`):
  - `Cache-Control: public, max-age=31536000, immutable`
- **HTML Files**:
  - `Cache-Control: public, max-age=0, must-revalidate`
- **API Responses**:
  - Defaults to `no-cache` where session/state is involved.

---

## Rollback Plan

1. Keep previous `dist/` directory or container image.
2. If the new deploy fails:
   - Switch Nginx symlink back to previous `dist`.
   - Revert DB schema if incompatible (restore backup from `src/db/backups`).
   - Restart PM2/Docker service.
