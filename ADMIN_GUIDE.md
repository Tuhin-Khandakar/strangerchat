# Admin Panel Guide

The STRNGR Admin Panel is a powerful tool for monitoring chat activity, managing bans, and configuring moderation rules.

## Accessing the Admin Panel

1.  Navigate to `/admin.html` on your deployment.
2.  Enter the `ADMIN_PASSWORD` configured in your environment variables.
3.  Once authenticated, you will have access to real-time metrics and moderation tools.

## Features

### 1. Dashboard Metrics

- **Active Connections**: Total users currently connected to the WebSocket.
- **Waiting Users**: Number of users in the matchmaking queue.
- **Violation Count**: Total profanity filter violations in the last 24 hours.
- **Active Bans**: Current number of IPs that are restricted from connecting.
- **Pending Appeals**: Number of users who have requested a ban review.

### 2. Banned Words Management

- **Add Word**: Add a new word or phrase to the filter.
- **Severity Levels**:
  - **Level 1 (Block Only)**: Message is blocked, user gets a warning.
  - **Level 2 (Violation)**: Message is blocked, violation is recorded. User is auto-banned after 3 violations.
  - **Level 3 (Instant Ban)**: User is immediately banned upon sending the word.
- **Regex Support**: Use regular expressions for complex pattern matching.
- **Enable/Disable**: Toggle words without deleting them.

### 3. Violation Logs

- View a list of recent filter violations including IP hashes, violated words, and original message text.
- **Ban User**: Manually ban a user directly from the violation list.
- **Export**: Download violation data as CSV for offline analysis.

### 4. Ban Management

- View all active bans and their expiration dates.
- **Manual Ban**: Ban a specific IP hash for a custom duration (1-365 days).
- **Lift Ban**: Immediately restore access for a banned IP hash.
- **Export**: Download active ban list as CSV.

### 5. Moderation Queue (Flagged Messages)

- Messages with "Borderline Toxicity" (scored by ML) are sent here for human review.
- **Approve**: Clear the message and take no action.
- **Ban**: Confirm the violation and ban the user.

### 6. IP Range Banning (CIDR)

- Block entire networks or regions by specifying a CIDR range (e.g., `1.2.3.0/24`).
- Useful for stopping mass bot attacks from specific data centers.

### 7. Appeals System

- Users can submit appeals from the "Banned" screen.
- Admins can review, approve (unban), or reject appeals.

## Security Best Practices for Admins

1.  **Change Default Password**: Ensure `ADMIN_PASSWORD` is long and complex.
2.  **Use HTTPS**: Never access the admin panel over unencrypted HTTP, as your password can be intercepted.
3.  **Review Logs Regularly**: Periodically check `moderation_logs` to ensure no unauthorized actions were taken.
4.  **Least Privilege**: Only share the admin password with trusted moderators.

## Real-time Updates

The admin panel uses Socket.IO to receive real-time updates. You will see "toast" notifications as violations occur or users are matched, allowing for proactive moderation.
