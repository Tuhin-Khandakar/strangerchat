# Database Migration Guide

STRNGR uses SQLite with `better-sqlite3`. Migrations must be handled carefully to maintain data integrity.

---

## Principles

1. **Always backup before migrations**: Automated backups are in `src/db/backups`.
2. **Migrations must be idempotent**: Schema init in `src/server.js` uses `CREATE TABLE IF NOT EXISTS`.
3. **Avoid destructive changes**: Prefer adding columns to renaming or deleting.
4. **Test migrations in staging**: Use a copy of production data for testing.

---

## Backup Procedure

Manual backup:

```bash
cp src/db/moderation.db src/db/backups/manual_pre_migration_$(date +%Y%m%d).db
```

---

## Migration Execution

### Option A: Automatic migrations (Default)

The server performs schema checks on startup. Adding columns or tables can be done by updating the initialization logic in `src/server.js`.

### Option B: Manual migration script

For complex data transformations, create a standalone Node script using `better-sqlite3`.

```bash
node scripts/migrate-v2.js
```

---

## Safe Migration Patterns

- **Add columns with defaults**:
  `ALTER TABLE user_moderation ADD COLUMN reputation_score INTEGER DEFAULT 100`
- **Add new tables**:
  `CREATE TABLE IF NOT EXISTS moderation_logs (...)`
- **Indexing**:
  Always add `IF NOT EXISTS` to index creation to prevent startup failures.

---

## Rollback Strategy

If a migration causes issues:

1. Stop the application.
2. Restore the previous database version from `src/db/backups/`.
3. Revert the code version to the previous stable release.
4. Restart the service.

---
