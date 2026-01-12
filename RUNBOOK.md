# STRNGR Runbook (Monitoring, Alerts, Incidents)

This is the operational guide for running STRNGR in production.

---

## Monitoring

### Key Metrics (Prometheus)

- **Availability**: HTTP 5xx rate, Socket.IO connection errors.
- **Latency**: `http_request_duration_seconds`, `strngr_db_query_duration_seconds`.
- **User Activity**: `strngr_connected_users`, `strngr_matches_total`.
- **Health**: `strngr_db_slow_queries_total`, `strngr_client_errors_total`.

### Metrics Endpoint

- URL: `/metrics`
- Authentication: Basic Auth (`admin` / `ADMIN_PASSWORD`).

---

## Recommended Alerts

### Critical

- **Service Down**: Prometheus `up == 0`.
- **Database Unhealthy**: `strngr_db_health_check_failed` (internal log alert).
- **High Error Rate**: 5% of requests returning 5xx status for > 5 minutes.

### Warning

- **Slow Matches**: Matchmaking taking > 30 seconds for most users.
- **Spam Burst**: Rapid increase in `strngr_filter_violations_total` from a single IP range.
- **Disk Usage**: `src/db` partition exceeding 80% usage.

---

## Incident Response

### Severity Levels

- **SEV1**: Complete outage, users cannot connect or send messages.
- **SEV2**: Degraded experience (slow matching, high latency, admin panel down).
- **SEV3**: Minor bugs, monitoring failures, CSS glitches.

### Standard checklist

1. **Verify**: Check server logs (`combined.log`) and Prometheus graphs.
2. **Mitigate**: If it started after a deploy, **Rollback** immediately.
3. **Analyze**: If load is the issue, check rate limits and PoW difficulty.
4. **Communicate**: Post an update on your status page or landing page.

---

## Disaster Recovery

### Backup Policy

- Daily automated backups maintained for last 7 days.
- Weekly backups maintained for 1 month.

### Restore procedure

1. Stop the Node server: `pm2 stop strngr-app`.
2. Locate the most recent healthy backup in `src/db/backups/`.
3. Copy it to `src/db/moderation.db`.
4. Verify database integrity: `sqlite3 src/db/moderation.db "PRAGMA integrity_check;"`.
5. Start the server: `pm2 start strngr-app`.

### Data Retention

- Anonymous chat messages are **never** stored.
- Moderation logs and violation history are pruned after 30 days automatically (`cleanupOldRecords` cron).

---
