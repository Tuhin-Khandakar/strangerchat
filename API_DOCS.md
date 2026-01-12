# STRNGR API Documentation

This document describes server endpoints used by the STRNGR client, admin panel, monitoring, and telemetry.

> **Base URL:** `https://<your-domain>`  
> **Local:** `http://localhost:<PORT>`

---

## Authentication

### Admin authentication

Admin endpoints require authentication.

**Auth implementation:**

- **Session cookie**: Managed via `express-session`. Sets `isAdmin` to true upon successful login at `POST /admin/api/login`.
- **Basic Auth**: Used for the `/metrics` endpoint to allow Prometheus scraping.

---

## Public Endpoints

### Stats

`GET /api/stats`

- Returns current server statistics (online users).
- **200** OK

### Feedback (Bug reports)

`POST /api/feedback`
Body (JSON):

```json
{
  "type": "bug|feature|general",
  "text": "what happened",
  "additionalData": {
    "userAgent": "...",
    "url": "..."
  }
}
```

Responses:

- **200** OK
- **400** invalid input
- **429** rate limited

### Client Error Logging

`POST /api/logs/error`
Body (JSON):

```json
{
  "message": "Error message",
  "stack": "stacktrace",
  "url": "page url",
  "userAgent": "...",
  "type": "uncaught|promise|..."
}
```

### Client Performance Metrics

`POST /api/logs/perf`
Body (JSON):

```json
{
  "name": "LCP|CLS|FID",
  "value": 1234,
  "delta": 12,
  "id": "..."
}
```

---

## Admin API (Protected)

### Admin Login

`POST /admin/api/login`
Body:

```json
{ "password": "..." }
```

Responses:

- **200** success (sets session cookie)
- **401** invalid
- **429** rate limited (admin login limiter)

---

### Dashboard / Moderation Stats

`GET /api/moderation/stats`
Returns:

```json
{
  "violations": 150,
  "active_bans": 5,
  "pending_appeals": 2
}
```

---

### Moderation Logs

`GET /api/moderation/logs`

- Returns recent moderation actions log from the database.

---

### Exports

`GET /api/moderation/export`

- Export violation data in JSONL format for machine learning training.

---

## Monitoring

### Prometheus metrics

`GET /metrics`

- **Protected endpoint** (Basic Auth: `admin` / `ADMIN_PASSWORD`)
- Exposes counters, gauges, histograms (matches, bans, durations, slow DB queries, client errors).

---

## Error Codes (common)

- **400** Invalid payload
- **401** Unauthorized / invalid auth
- **403** Forbidden
- **404** Not found
- **429** Rate limited
- **500** Server error

---

## Security Notes

- All endpoints sanitize inputs and limit payload sizes (10kb for JSON/URL-encoded).
- Admin endpoints are protected by `requireAdmin` middleware.
- Metrics endpoint is protected by Basic Auth.
