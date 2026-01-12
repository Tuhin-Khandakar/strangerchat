# Monitoring & Observability Guide

This service is instrumented with **Winston** for structured logging and **Prometheus** for metrics.

## Logging

Structured logs are output to:

- `combined.log`: All logs (info, warn, error)
- `error.log`: Only error level logs
- Console: Human-readable logs (in development)

**Log Format (JSON):**

```json
{
  "level": "info",
  "message": "Incoming Request",
  "timestamp": "2024-01-09T12:00:00.000Z",
  "service": "strngr-server",
  "method": "POST",
  "url": "/api/...",
  "status": 200,
  "duration": 0.123,
  "requestId": "uuid...",
  "ip": "::1"
}
```

## Metrics (Prometheus)

Metrics are exposed at `/metrics` for scraping.

### Custom Metrics

| Metric Name                           | Type      | Description                  | Labels                           |
| ------------------------------------- | --------- | ---------------------------- | -------------------------------- |
| `http_request_duration_seconds`       | Histogram | HTTP request latency         | `method`, `route`, `status_code` |
| `strngr_connected_users`              | Gauge     | Active Socket.IO connections | -                                |
| `strngr_matchmaking_duration_seconds` | Histogram | Time to find a match         | -                                |
| `strngr_messages_total`               | Counter   | Total messages sent          | `status` (success/blocked)       |
| `strngr_db_query_duration_seconds`    | Histogram | DB query latency             | `operation`                      |
| `strngr_filter_violations_total`      | Counter   | Profanity filter violations  | -                                |

## Health Check

Endpoint: `GET /health`

**Response:**

```json
{
  "status": "healthy",
  "uptime": 120.5,
  "db": "connected"
}
```

## Admin Stats

Endpoint: `GET /admin/api/stats` (Requires Admin Auth)

Returns aggregated moderation statistics including:

- Active connections
- Total filter violations
- Active bans
- Total user reports
- Users currently waiting in queue

## Alerting Configuration

To ensure high availability, configure an external monitoring system (e.g., Pingdom, UptimeRobot, Prometheus Alertmanager) with the following alerts.

### 1. Critical Downtime Alert (Health Check)
- **Endpoint:** `GET /health`
- **Condition:** Status code != 200 AND JSON `status` != "healthy"
- **Frequency:** Check every 1 minute
- **Notification:** Critical call/SMS to on-call engineer and Email to `admin@strngr.chat`.
- **Response:** Investigating server crash or database connectivity loss.

### 2. High Error Rate / Elevated Log Volume
- **Source:** Log Aggregator or Prometheus (`strngr_client_errors_total` or HTTP 500 status codes)
- **Condition:** > 1% of requests returning 5xx status codes over 5 minutes OR > 20 error logs/minute.
- **Frequency:** Evaluate every 5 minutes.
- **Notification:** Slack channel `#ops-alerts` and Email.
- **Response:** Check `error.log` for stack traces and `combined.log` for traffic patterns.

### 3. Database Health
- **Metric:** `db.connected` (from `/health` response)
- **Condition:** value is `false`
- **Notification:** Critical (same as downtime).
