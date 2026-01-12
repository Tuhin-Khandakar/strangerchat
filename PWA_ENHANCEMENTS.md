# PWA Enhancement Documentation

## Overview

This document describes the enhanced Progressive Web App (PWA) functionality implemented in STRNGR. The enhancements significantly improve offline capabilities, user engagement, and overall app experience.

## Features Implemented

### 1. Dynamic Cache Versioning with Build Hash

**Location:** `public/sw.js`

Instead of manually updating cache versions, the service worker now automatically uses the build hash from Vite's manifest:

```javascript
// Automatically extracts hash from manifest.json
const initCacheVersion = async () => {
  const manifest = await fetch('/.vite/manifest.json');
  // Extracts hash like "abc123" from "assets/index-abc123.js"
  CACHE_VERSION = `strngr-${BUILD_HASH}`;
};
```

**Benefits:**

- No manual version updates needed
- Automatic cache invalidation on new builds
- Prevents stale content issues

### 2. Background Sync for Failed Messages

**Locations:** `public/sw.js`, `src/client/scripts/chat.js`, `src/client/scripts/app.js`

Messages that fail to send are automatically stored and retried when the connection is restored:

**How it works:**

1. Failed messages are stored in the `strngr-messages` cache
2. Background sync event is registered
3. Service worker attempts to resend when online
4. Fallback to visibility change events for unsupported browsers

**User Experience:**

- Messages never lost due to poor connection
- Automatic retry without user intervention
- Visual feedback when sync completes

### 3. Push Notification Preferences

**Location:** `src/client/scripts/app.js`

Users can now control notification preferences with a user-friendly interface:

**Features:**

- Custom permission prompt before browser prompt
- Granular controls (messages, matches, system)
- Persistent storage in localStorage
- Easy opt-in/opt-out

**Usage:**

```javascript
// Request notification permission
await PWAManager.requestNotificationPermission();

// Toggle specific notification types
PWAManager.toggleNotifications('messages');
```

**Preferences Structure:**

```json
{
  "enabled": true,
  "messages": true,
  "matches": true,
  "system": false
}
```

### 4. Notification Grouping

**Location:** `public/sw.js`

Multiple notifications are automatically grouped to prevent notification spam:

**How it works:**

- Uses notification tags to group related messages
- Replaces existing notifications with count
- Shows "You have X new messages" for multiple messages
- Individual notification for single messages

**Example:**

```
First message: "New message from stranger"
Second message: "You have 2 new messages"
Third message: "You have 3 new messages"
```

### 5. App Shortcuts Integration

**Locations:** `public/manifest.json`, `src/client/scripts/app.js`

App shortcuts defined in manifest.json are now fully functional:

**Available Shortcuts:**

1. **Start Chat** - Launches directly into chat (`/?action=chat`)
2. **View Terms** - Opens terms of service

**Implementation:**

```javascript
handleAppShortcuts() {
  const action = new URLSearchParams(window.location.search).get('action');
  if (action === 'chat') {
    // Auto-start chat
  }
}
```

### 6. Smart Install Prompt

**Location:** `src/client/scripts/app.js`

Install prompt now shows at the optimal time based on user engagement:

**Improvements:**

- Tracks user interactions (clicks, scrolls, keydown)
- Shows after 5+ meaningful interactions
- Better visual design with icon and subtitle
- Remembers if user installed or dismissed
- Session-based dismissal

**Before:** Showed immediately after 2 seconds
**After:** Shows after user demonstrates interest

### 7. Update Notification

**Location:** `src/client/scripts/app.js`

Users are notified when a new version is available:

**Features:**

- Automatic update detection
- Prominent banner at top of screen
- One-click update and reload
- Periodic update checks (hourly)

**User Flow:**

1. New service worker detected
2. Banner appears: "A new version of STRNGR is available!"
3. User clicks "Update Now"
4. Page reloads with new version

### 8. Offline Indicator

**Location:** `src/client/scripts/app.js`

Visual indicator shows when the app is offline:

**Features:**

- Automatic detection of online/offline state
- Fixed position indicator at bottom of screen
- Service worker communication for network status
- Smooth animations

**Appearance:**

- Red background with warning icon
- "You're offline" message
- Positioned above chat controls

### 9. Smart Cache Eviction

**Location:** `public/sw.js`

Intelligent cache management prevents unlimited growth:

**Strategy:**

- LRU (Least Recently Used) eviction
- Size limits per cache type:
  - Static: 50MB, 100 items
  - Dynamic: 20MB, 50 items
  - Messages: 5MB, 100 items
- Automatic cleanup on cache operations

**Implementation:**

```javascript
const smartCacheEviction = async (cacheName, limits) => {
  // Tracks size and item count
  // Removes oldest items when limits exceeded
};
```

## Cache Strategy Summary

### Static Assets (Cache First)

- HTML, CSS, JavaScript, images, fonts
- Served from cache if available
- Network fallback for new assets
- Automatic caching of same-origin resources

### Navigation (Network First)

- HTML pages
- Always try network first
- Fallback to cache if offline
- Offline page as last resort

### Socket.IO (Stale-While-Revalidate)

- Serve from cache immediately
- Update cache in background
- Ensures fast loading with fresh content

### API Calls (Network Only)

- Excluded from caching: `/admin`, `/api/moderation`, `/metrics`
- Always fetch from network
- No caching for sensitive data

## Service Worker Communication

The service worker communicates with clients using `postMessage`:

### Messages from Service Worker to Client:

```javascript
// Update available
{ type: 'SW_UPDATE', message: '...', oldVersion: '...', newVersion: '...' }

// Network status
{ type: 'OFFLINE' }
{ type: 'ONLINE' }

// Sync status
{ type: 'SYNC_COMPLETE', success: true/false, error: '...' }
```

### Messages from Client to Service Worker:

```javascript
// Skip waiting and activate new SW
{ type: 'SKIP_WAITING' }

// Request caching of specific URLs
{ type: 'CACHE_URLS', urls: [...] }
```

## Browser Support

### Full Support:

- Chrome/Edge 80+
- Firefox 90+
- Safari 15.4+

### Partial Support:

- Older browsers: Basic PWA features without background sync
- iOS Safari: Limited background sync (uses visibility change fallback)

### Graceful Degradation:

- All features have fallbacks
- App remains functional without PWA features
- Progressive enhancement approach

## Testing PWA Features

### Install Prompt:

1. Open app in supported browser
2. Interact with the page (click, scroll)
3. After 5 interactions, install banner appears
4. Click "Install" to test installation

### Background Sync:

1. Start a chat
2. Turn off network (DevTools > Network > Offline)
3. Send a message (will fail)
4. Turn network back on
5. Message should sync automatically

### Update Notification:

1. Make changes to code
2. Run `npm run build`
3. Deploy new version
4. Open app (old version)
5. Update banner should appear

### Offline Indicator:

1. Open app
2. Toggle network in DevTools
3. Offline indicator appears/disappears

### Notification Grouping:

1. Enable notifications
2. Send multiple push notifications quickly
3. Should group into single notification with count

## Performance Metrics

### Cache Efficiency:

- First load: ~2-3 seconds
- Repeat visits: ~200-500ms (from cache)
- Offline: Instant (from cache)

### Storage Usage:

- Typical: 5-10MB
- Maximum: 75MB (with all caches at limit)
- Automatic cleanup prevents growth

### Update Speed:

- Detection: Instant (on page load)
- Download: Background (doesn't block UI)
- Activation: User-initiated (one click)

## Troubleshooting

### Install Prompt Not Showing:

- Check if already installed: Look for "strngr_installed" in localStorage
- Check engagement: Need 5+ interactions
- Check browser support: Chrome/Edge only

### Background Sync Not Working:

- Check browser support: Chrome/Edge 80+
- Check registration: Look for "Background sync registered" in console
- Fallback: Visibility change should trigger sync

### Notifications Not Working:

- Check permission: Browser settings
- Check preferences: localStorage "strngr_notification_prefs"
- Check service worker: Must be registered

### Cache Not Clearing:

- Manual clear: DevTools > Application > Storage > Clear site data
- Automatic: New version should clear old caches
- Check version: Look for cache name in DevTools

## Future Enhancements

### Planned:

1. **Offline chat history** - Full IndexedDB integration
2. **Share target** - Share to STRNGR from other apps
3. **File caching** - Cache user-uploaded images
4. **Predictive prefetching** - Preload likely next pages
5. **Advanced analytics** - Track PWA usage metrics

### Under Consideration:

1. **Web Share API** - Share conversations
2. **Badging API** - Show unread count on app icon
3. **Contact Picker** - Invite friends
4. **Clipboard API** - Copy/paste enhancements

## Best Practices

### For Developers:

1. **Always test offline** - Use DevTools offline mode
2. **Monitor cache size** - Check Application tab regularly
3. **Version carefully** - Build hash handles this automatically
4. **Test updates** - Verify update flow works smoothly
5. **Check console** - Service worker logs important info

### For Users:

1. **Install the app** - Better performance and offline access
2. **Enable notifications** - Stay connected to chats
3. **Update regularly** - Click update banner when it appears
4. **Clear cache if issues** - Browser settings > Clear data

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Workbox (Google)](https://developers.google.com/web/tools/workbox)

## Changelog

### Version 2.0 (Current)

- ✅ Dynamic cache versioning with build hash
- ✅ Background sync for failed messages
- ✅ Push notification preferences
- ✅ Notification grouping
- ✅ App shortcuts integration
- ✅ Smart install prompt
- ✅ Update notification
- ✅ Offline indicator
- ✅ Smart cache eviction

### Version 1.0 (Previous)

- Basic service worker
- Manual cache versioning
- Simple push notifications
- Basic offline support
