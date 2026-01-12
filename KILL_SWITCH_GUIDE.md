# 🚨 Emergency Kill Switch Guide

## Overview

The Emergency Kill Switch allows you to immediately disable matchmaking and disconnect all users in case of emergencies.

## When to Use

- **Abuse wave or spam attack** - Overwhelming number of malicious users
- **Server instability** - Critical bugs or performance issues
- **Media attention** - Unexpected viral growth requiring immediate pause
- **Database issues** - Critical data integrity problems
- **Legal/compliance emergencies** - Immediate shutdown required

## How to Access

### Admin Panel

1. Navigate to `/admin.html`
2. Login with your admin password
3. Click the **🚨 Kill Switch** tab
4. Review the current status

### API Endpoints

#### Check Status (Public)

```bash
GET /api/maintenance/status
```

Response:

```json
{
  "maintenance": false,
  "reason": null,
  "timestamp": 1736539200000
}
```

#### Enable Maintenance Mode (Admin Only)

```bash
POST /api/maintenance/enable
Content-Type: application/json
x-csrf-token: <token>

{
  "reason": "Emergency maintenance - back soon"
}
```

Response:

```json
{
  "success": true,
  "message": "Maintenance mode enabled",
  "disconnected": 42
}
```

#### Disable Maintenance Mode (Admin Only)

```bash
POST /api/maintenance/disable
Content-Type: application/json
x-csrf-token: <token>
```

Response:

```json
{
  "success": true,
  "message": "Maintenance mode disabled. Service restored."
}
```

## What Happens When Activated

1. **Immediate Effects:**
   - All active users receive a `maintenance_mode` event
   - After 3 seconds, all connections are forcefully disconnected
   - New connection attempts are blocked

2. **Matchmaking:**
   - `find_match` events are rejected with maintenance error
   - Users see the custom reason you provided

3. **Logging:**
   - Event is logged to Winston with WARN level
   - Includes admin session info and timestamp

## Command Line Usage

### Using cURL

```bash
# Check status
curl http://localhost:3000/api/maintenance/status

# Enable (requires session cookie)
curl -X POST http://localhost:3000/api/maintenance/enable \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -H "x-csrf-token: <your-csrf-token>" \
  -d '{"reason":"Emergency shutdown"}'

# Disable
curl -X POST http://localhost:3000/api/maintenance/disable \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -H "x-csrf-token: <your-csrf-token>"
```

### Using PowerShell

```powershell
# Check status
Invoke-RestMethod -Uri "http://localhost:3000/api/maintenance/status"

# Enable (after logging in to admin panel)
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
# ... add cookies from browser ...
Invoke-RestMethod -Uri "http://localhost:3000/api/maintenance/enable" `
  -Method POST `
  -WebSession $session `
  -ContentType "application/json" `
  -Body '{"reason":"Emergency maintenance"}'
```

## Recovery Steps

1. **Enable Maintenance Mode**
   - Stops all user activity immediately
   - Gives you time to investigate

2. **Fix the Issue**
   - Address the root cause
   - Test thoroughly

3. **Disable Maintenance Mode**
   - Service resumes immediately
   - Users can reconnect

## Security Notes

- ✅ **Admin authentication required** - Only logged-in admins can toggle
- ✅ **CSRF protection** - All state-changing requests require valid CSRF token
- ✅ **Rate limiting** - Admin login limited to 5 attempts per 15 minutes
- ✅ **Session expiration** - Admin sessions expire after 24 hours
- ✅ **Audit logging** - All maintenance mode changes are logged

## Client-Side Handling

When maintenance mode is enabled, clients receive:

```javascript
socket.on('maintenance_mode', (data) => {
  // data.reason contains the custom message
  alert(data.reason);
  // Connection will be closed after 3 seconds
});

socket.on('error', (error) => {
  if (error.type === 'maintenance') {
    // Matchmaking was blocked due to maintenance
    showMaintenanceMessage(error.message);
  }
});
```

## Best Practices

1. **Always provide a clear reason** - Users deserve to know why
2. **Monitor logs** - Check `combined.log` for maintenance events
3. **Test regularly** - Practice using the kill switch in development
4. **Communicate** - If possible, warn users before enabling
5. **Document incidents** - Keep a log of when and why you used it

## Troubleshooting

### Kill switch not working?

- Verify admin session is active
- Check CSRF token is being sent
- Review server logs for errors

### Users still connecting?

- Maintenance mode only blocks `find_match`
- Existing connections may persist briefly
- Force disconnect happens after 3 seconds

### Can't disable maintenance mode?

- Ensure you're logged in as admin
- Check server is running
- Verify database is accessible

## Related Files

- **Server Logic:** `src/server.js` (lines 236-241, 677-732, 2147-2155)
- **Admin UI:** `src/client/admin.html` (Emergency Kill Switch section)
- **Admin JS:** `src/client/scripts/admin.js` (maintenance functions)

---

**Remember:** This is a last resort. Use it wisely, but don't hesitate when needed.
