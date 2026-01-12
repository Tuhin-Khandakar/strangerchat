# Database-Backed Banned Words Implementation

## Overview

Successfully migrated the profanity/spam filter from a hardcoded array to a database-backed system with escalation tracking and auto-ban functionality.

## Changes Made

### 1. Database Schema (Lines 106-161)

Created three new database tables:

#### `banned_words` Table

- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `word` (TEXT NOT NULL UNIQUE)
- `severity` (TEXT DEFAULT 'medium')
- `created_at` (INTEGER NOT NULL)

Stores the list of banned words/phrases with severity levels.

#### `filter_violations` Table

- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `ip_hash` (TEXT NOT NULL)
- `violated_word` (TEXT NOT NULL)
- `message_text` (TEXT)
- `created_at` (INTEGER NOT NULL)

Tracks every time a user hits the filter, including which word was violated and the message content.

#### Index

- `idx_filter_violations_ip_time` on `filter_violations(ip_hash, created_at)` for fast lookups

### 2. Initial Data Seeding (Lines 138-151)

Automatically seeds the database with initial banned words from the previous hardcoded array:

- 'spamlink.com' (severity: high)
- 'badword1' (severity: medium)

### 3. Configuration Updates (Lines 180-195)

- **Removed**: `BANNED_WORDS` hardcoded array
- **Added**:
  - `FILTER_VIOLATION_THRESHOLD: 3` - Auto-ban after 3 violations
  - `FILTER_VIOLATION_WINDOW: 24 * 60 * 60 * 1000` - 24-hour window

### 4. Helper Functions (Lines 350-473)

#### `loadBannedWords()`

- Loads all banned words from the database
- Implements 5-minute caching to reduce database queries
- Returns array of lowercase word strings
- Gracefully handles database errors by returning cached data

#### `checkMessageAgainstFilter(text)`

- Checks a message against all banned words
- Returns `{ blocked: boolean, word: string|null }`
- Case-insensitive matching

#### `recordFilterViolation(ipHash, violatedWord, messageText)`

- Records each filter violation in the database
- Stores the violated word and message content for moderation review

#### `checkFilterViolations(ipHash)`

- Counts violations within the 24-hour window
- Auto-bans users after 3 violations
- Updates the `user_moderation` table with ban status
- Returns `true` if user should be banned

### 5. Updated Profanity Filter Logic (Lines 631-651)

The `send_msg` handler now:

1. Checks message against database-backed filter
2. Records violation if blocked
3. Checks if user has exceeded violation threshold
4. Auto-bans and disconnects user if threshold exceeded
5. Otherwise, sends error message to user

## Auto-Ban Logic Flow

```
User sends message with banned word
    ↓
checkMessageAgainstFilter() → blocked: true
    ↓
recordFilterViolation() → saves to database
    ↓
checkFilterViolations() → counts recent violations
    ↓
If count >= 3 within 24 hours:
    ↓
Update user_moderation.banned_until
    ↓
Emit 'banned' event
    ↓
Disconnect socket
```

## Benefits

1. **Centralized Management**: Banned words can be managed in the database without code changes
2. **Severity Levels**: Words can be categorized by severity for future escalation logic
3. **Audit Trail**: All filter violations are logged for moderation review
4. **Automatic Enforcement**: Users are automatically banned after repeated violations
5. **Performance**: Caching reduces database load
6. **Scalability**: Easy to add/remove words or adjust thresholds

## Future Enhancements

1. **Admin Interface**: Create an admin panel to manage banned words
2. **Severity-Based Actions**: Different actions based on word severity
3. **Pattern Matching**: Add regex support for more sophisticated filtering
4. **Appeal System**: Allow users to appeal auto-bans
5. **Analytics**: Dashboard showing filter violation trends
6. **Whitelist**: Add exceptions for legitimate use of flagged words

## Testing Recommendations

1. Test that initial words are seeded on first run
2. Verify filter blocks messages containing banned words
3. Confirm violations are recorded in the database
4. Test auto-ban after 3 violations within 24 hours
5. Verify cache invalidation after 5 minutes
6. Test graceful degradation if database fails

## Database Queries for Management

### Add a new banned word

```sql
INSERT INTO banned_words (word, severity, created_at)
VALUES ('newbadword', 'high', strftime('%s', 'now') * 1000);
```

### Remove a banned word

```sql
DELETE FROM banned_words WHERE word = 'oldword';
```

### View recent violations

```sql
SELECT * FROM filter_violations
ORDER BY created_at DESC
LIMIT 50;
```

### View users with most violations

```sql
SELECT ip_hash, COUNT(*) as violation_count
FROM filter_violations
GROUP BY ip_hash
ORDER BY violation_count DESC
LIMIT 20;
```
