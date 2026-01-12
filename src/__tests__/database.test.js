// Set DB_NAME to memory for isolation BEFORE importing server
process.env.DB_NAME = ':memory:';

import {
  checkDatabaseHealth,
  reportUser,
  checkMessageAgainstFilter,
  recordFilterViolation,
  checkFilterViolations,
  db,
} from '../server.js';

describe('Database Operations', () => {
  // Seed some data if needed, or rely on functions

  // We need to ensure DB tables are created (server.js does this on load)

  beforeEach(() => {
    // Clean up tables
    db.prepare('DELETE FROM user_moderation').run();
    db.prepare('DELETE FROM filter_violations').run();
    // banned_words are seeded on init, we can keep them or clear and re-add
  });

  test('health check returns true', () => {
    expect(checkDatabaseHealth()).toBe(true);
  });

  test('should report user and ban after threshold', async () => {
    const ipHash = 'hash_123';

    // Report 1
    await reportUser(ipHash);
    let row = db.prepare('SELECT * FROM user_moderation WHERE ip_hash = ?').get(ipHash);
    expect(row.reports).toBe(1);
    expect(row.banned_until).toBeNull();

    // Report up to threshold (5)
    await reportUser(ipHash); // 2
    await reportUser(ipHash); // 3
    await reportUser(ipHash); // 4
    await reportUser(ipHash); // 5

    row = db.prepare('SELECT * FROM user_moderation WHERE ip_hash = ?').get(ipHash);
    expect(row.reports).toBe(5);
    expect(row.banned_until).not.toBeNull();
    expect(row.banned_until).toBeGreaterThan(Date.now());
  });

  test('checkMessageAgainstFilter should detect bad words', async () => {
    // "badword1" is seeded in server.js
    const result = await checkMessageAgainstFilter('This contains badword1');
    expect(result.blocked).toBe(true);
    expect(result.word).toBe('badword1');
  });

  test('should NOT block innocent messages', async () => {
    const result = await checkMessageAgainstFilter('Hello friend');
    expect(result.blocked).toBe(false);
  });

  test('recordFilterViolation should save to db', async () => {
    const ipHash = 'hash_violator';
    await recordFilterViolation(ipHash, 'badword', 'Full message with badword');

    const row = db.prepare('SELECT * FROM filter_violations WHERE ip_hash = ?').get(ipHash);
    expect(row).toBeDefined();
    expect(row.violated_word).toBe('badword');
  });

  test('checkFilterViolations should auto-ban after threshold', async () => {
    const ipHash = 'hash_repeat_violator';

    // 1st violation
    await recordFilterViolation(ipHash, 'bad', 'bad 1');
    let banned = await checkFilterViolations(ipHash);
    expect(banned).toBe(false);

    // 2nd
    await recordFilterViolation(ipHash, 'bad', 'bad 2');
    banned = await checkFilterViolations(ipHash);
    expect(banned).toBe(false);

    // 3rd (Threshold is 3)
    await recordFilterViolation(ipHash, 'bad', 'bad 3');
    banned = await checkFilterViolations(ipHash);

    // Should be banned now
    expect(banned).toBe(true);

    const userRow = db.prepare('SELECT * FROM user_moderation WHERE ip_hash = ?').get(ipHash);
    expect(userRow).toBeDefined();
    expect(userRow.banned_until).not.toBeNull();
  });
});
