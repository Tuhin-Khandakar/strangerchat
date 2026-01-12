# Moderation System Documentation

## Overview

The STRNGR moderation system is designed to ensure a safe and respectful environment for all users. It utilizes a multi-layered approach combining automated filtering, reputation tracking, and user reporting mechanisms.

## Automated Filtering

The system checks every message against a database of banned words and patterns.

### Features

- **Regex Support**: Advanced pattern matching allows detecting variations of banned words.
- **Whitelist System**: Prevents false positives by allowing banned sub-strings when they appear in trusted phrases (e.g., allowing "Scunthorpe" despite containing a banned word).
- **Severity Levels**:
  - **Level 1 (Low)**: Warning.
  - **Level 2 (Medium)**: 24-hour ban.
  - **Level 3 (High)**: 7-day ban.

### Violations

Violations are recorded in the database.

- **Auto-Ban**: If a user accumulates **3 filter violations** within 24 hours, they receive an automatic temporary ban.
- **Reputation Impact**: Each violation reduces the user's reputation score.

## User Reputation

Every user (identified by IP Hash) starts with a reputation score of **100**.

- **Initial Score**: 100
- **Penalties**:
  - Filter Violation: Score reduction.
  - User Report: Score reduction.
  - Auto-Ban: Significant score reduction (-50).
- **Thresholds**:
  - Users with very low reputation may face stricter rate limits or shadow-banning (future feature).

## Appeals Process

Users who believe they were banned incorrectly can submit an appeal.

- **Endpoint**: `POST /api/appeals`
- **Body**: `{ "reason": "Explanation..." }`
- **Review**: Admins can review pending appeals via the dashboard API.

## Admin Dashboard & Tools

The system exposes several API endpoints for moderation dashboards (secured by Admin Token).

- **Stats**: `GET /api/moderation/stats` (Violations, Active Bans, Pending Appeals)
- **Logs**: `GET /api/moderation/logs` (Audit trail of all actions)
- **Data Export**: `GET /api/moderation/export` (JSONL export of violations for ML training)

## Configuration

System constraints and thresholds are stored in the `system_config` database table, allowing runtime updates without code deployment.

### Configurable Parameters

- `MSG_MAX_LENGTH`: Max message length.
- `REPORT_THRESHOLD`: Reports needed for auto-ban.
- `TEMP_BAN_DURATION`: Duration of standard bans (ms).
- `FILTER_VIOLATION_THRESHOLD`: Violations before auto-ban.
- `BAN_DURATION_HIGH`: Duration for high-severity bans.

## Database Schema

- **user_moderation**: Tracks IP hashes, reports, ban status, and reputation.
- **banned_words**: List of prohibited terms/patterns.
- **whitelisted_phrases**: Trusted phrases to bypass filters.
- **filter_violations**: Log of caught messages.
- **appeals**: User ban appeals.
- **moderation_logs**: System audit logs.
- **flagged_messages**: Queue for messages requiring human review (borderline toxicity).
- **banned_ranges**: CIDR blocks for IP range bans.

## Advanced Features (New)

### Machine Learning Integration

- **Toxicity Detection**: Integrates with Perspective API to analyze message sentiment.
- **Borderline Content**: Messages with toxicity scores between 0.6 and 0.8 are not blocked but are added to a **Moderation Queue** for human review.
- **High Toxicity**: Messages with a score > 0.8 are automatically blocked.

### Link & Image Detection

- **Link Blocking**: All URLs are detected and blocked by default to prevent spam and abuse.
- **Image Blocking**: Messages containing image links are treated as links and blocked.

### IP Range Banning

- **CIDR Support**: Admins can ban entire IP subnets (e.g., `192.168.1.0/24`) to combat persistent attackers using dynamic IPs.
- **Middleware Check**: Connections are rejected at the handshake level if the IP falls within a banned range.

### Moderation Queue

- **Purpose**: A holding area for ambiguous content.
- **Admin Action**: Admins can review flagged messages and verify if they are violations (ban user) or false positives (approve/ignore).
