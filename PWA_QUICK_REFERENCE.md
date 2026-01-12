# PWA Quick Reference Guide

## 🚀 Quick Start

### For Developers

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing PWA Features

```bash
# Build and test locally
npm run build
npm start

# Open http://localhost:3000
# Use Chrome DevTools > Application tab to inspect:
# - Service Worker
# - Cache Storage
# - Manifest
# - Notifications
```

---

## 📋 Key Files

### Service Worker

- **Location:** `public/sw.js`
- **Purpose:** Handles caching, background sync, notifications
- **Auto-registered:** Yes (in index.html)

### PWA Manager

- **Location:** `src/client/scripts/app.js`
- **Purpose:** Install prompts, notifications, offline detection
- **Initialization:** Automatic on page load

### Settings Manager

- **Location:** `src/client/scripts/app.js`
- **Purpose:** Settings modal UI and preferences
- **Access:** Click ⚙️ button in chat

### Styles

- **Main:** `src/client/styles/main.css`
- **PWA:** `src/client/styles/pwa-enhancements.css`

---

## 🔧 Common Tasks

### Update Cache Version

**No action needed!** Cache version is automatically generated from build hash.

### Add New Asset to Cache

Edit `BASE_ASSETS` array in `public/sw.js`:

```javascript
const BASE_ASSETS = [
  '/',
  '/index.html',
  '/your-new-asset.png', // Add here
];
```

### Modify Notification Preferences

Edit `loadNotificationPreferences()` in `src/client/scripts/app.js`:

```javascript
this.notificationPreferences = saved
  ? JSON.parse(saved)
  : {
      enabled: false,
      messages: true,
      matches: true,
      system: false,
      yourNewPref: true, // Add here
    };
```

### Change Cache Limits

Edit `CACHE_LIMITS` in `public/sw.js`:

```javascript
const CACHE_LIMITS = {
  static: { maxItems: 100, maxSize: 50 * 1024 * 1024 },
  dynamic: { maxItems: 50, maxSize: 20 * 1024 * 1024 },
  messages: { maxItems: 100, maxSize: 5 * 1024 * 1024 },
};
```

### Add New App Shortcut

Edit `public/manifest.json`:

```json
{
  "shortcuts": [
    {
      "name": "Your New Action",
      "short_name": "Action",
      "description": "Description here",
      "url": "/?action=your-action",
      "icons": [{ "src": "icons/your-icon.svg", "sizes": "96x96" }]
    }
  ]
}
```

Then handle in `src/client/scripts/app.js`:

```javascript
handleAppShortcuts() {
  const action = new URLSearchParams(window.location.search).get('action');
  if (action === 'your-action') {
    // Handle your action
  }
}
```

---

## 🐛 Debugging

### Service Worker Not Updating

1. Open DevTools > Application > Service Workers
2. Check "Update on reload"
3. Click "Unregister" if needed
4. Reload page

### Cache Not Clearing

```javascript
// Run in console
caches.keys().then((names) => {
  names.forEach((name) => caches.delete(name));
});
location.reload();
```

### Notifications Not Working

1. Check browser permission: `Notification.permission`
2. Check preferences: `localStorage.getItem('strngr_notification_prefs')`
3. Check service worker: `navigator.serviceWorker.controller`

### Background Sync Not Triggering

1. Check browser support: Chrome/Edge 80+ only
2. Check registration: Look for "Background sync registered" in console
3. Fallback: Visibility change events should work

---

## 📊 Monitoring

### Cache Size

```javascript
// Run in console
async function getCacheSize() {
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    console.log(`${name}: ${keys.length} items`);
  }
}
getCacheSize();
```

### Service Worker Status

```javascript
// Run in console
navigator.serviceWorker.getRegistration().then((reg) => {
  console.log('Active:', reg.active);
  console.log('Waiting:', reg.waiting);
  console.log('Installing:', reg.installing);
});
```

### Notification Preferences

```javascript
// Run in console
console.log(localStorage.getItem('strngr_notification_prefs'));
```

---

## 🎯 Testing Checklist

### Before Each Release

- [ ] Build completes without errors
- [ ] Service worker registers successfully
- [ ] Cache version updates automatically
- [ ] Install prompt shows after engagement
- [ ] Notifications work (if enabled)
- [ ] Background sync works (Chrome/Edge)
- [ ] Offline indicator appears when offline
- [ ] Settings modal opens and functions
- [ ] App shortcuts work
- [ ] Update notification appears for new version

### Manual Testing

```bash
# 1. Test offline mode
# - Open app
# - DevTools > Network > Offline
# - Navigate around
# - Should work from cache

# 2. Test background sync
# - Start chat
# - Go offline
# - Send message (fails)
# - Go online
# - Message should sync

# 3. Test install
# - Open in Chrome
# - Interact 5+ times
# - Install banner appears
# - Click install
# - App installs

# 4. Test notifications
# - Open settings
# - Enable notifications
# - Grant permission
# - Send test notification
# - Should appear

# 5. Test update
# - Make code change
# - Build new version
# - Deploy
# - Open old version
# - Update banner appears
# - Click update
# - Page reloads
```

---

## 🔐 Security Notes

### What's Cached

- ✅ Static assets (HTML, CSS, JS, images)
- ✅ Font files
- ✅ Socket.IO library
- ❌ API responses (except failed messages)
- ❌ Sensitive routes (/admin, /api/moderation)
- ❌ User data

### What's Stored Locally

- Notification preferences (localStorage)
- Installation status (localStorage)
- Chat state (sessionStorage)
- Failed messages (Cache API)

### Privacy Considerations

- No tracking without consent
- Notifications are opt-in
- Failed messages stored locally only
- No data sent to third parties

---

## 📱 Browser Support

### Full Support

- Chrome 80+
- Edge 80+
- Firefox 90+ (limited background sync)
- Safari 15.4+ (limited features)

### Partial Support

- Older browsers: Basic PWA without advanced features
- iOS Safari: Limited background sync, different install UX

### Graceful Degradation

All features have fallbacks:

- Background sync → Visibility change events
- Install prompt → Manual "Add to Home Screen"
- Notifications → In-app messages

---

## 🚨 Troubleshooting

### "Service Worker registration failed"

- Check HTTPS (required for SW)
- Check file path: `/sw.js` must be at root
- Check console for errors

### "Install prompt not showing"

- Check browser: Chrome/Edge only
- Check engagement: Need 5+ interactions
- Check localStorage: `strngr_installed` should be null

### "Notifications blocked"

- User must enable in browser settings
- Check permission: `Notification.permission`
- Show instructions in settings modal

### "Cache growing too large"

- Check limits in `CACHE_LIMITS`
- Run smart eviction manually
- Clear old caches

### "Background sync not working"

- Check browser: Chrome/Edge 80+ only
- Check network: Must go offline then online
- Check fallback: Visibility change should work

---

## 📚 Resources

### Documentation

- `PWA_ENHANCEMENTS.md` - Full feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- This file - Quick reference

### External Resources

- [MDN: Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Chrome DevTools: PWA](https://developer.chrome.com/docs/devtools/progressive-web-apps/)

---

## 💡 Tips & Tricks

### Force Service Worker Update

```javascript
// Run in console
navigator.serviceWorker.getRegistration().then((reg) => {
  reg.update();
});
```

### Clear All Data

```javascript
// Run in console
localStorage.clear();
sessionStorage.clear();
caches.keys().then((names) => {
  names.forEach((name) => caches.delete(name));
});
location.reload();
```

### Test Install Prompt

```javascript
// Run in console
// Note: Only works if beforeinstallprompt was deferred
window.PWAManager.showInstallBanner();
```

### Test Notification

```javascript
// Run in console (requires permission)
new Notification('Test', {
  body: 'This is a test notification',
  icon: '/logo.png',
});
```

### Simulate Offline

```javascript
// DevTools > Network > Offline
// Or run in console:
window.dispatchEvent(new Event('offline'));
```

---

## 🎨 Customization

### Change Install Banner Timing

Edit `trackUserEngagement()` in `src/client/scripts/app.js`:

```javascript
// Show after 5 interactions (default)
if (this.userEngagement >= 5 && !this.installPromptShown && this.deferredPrompt) {
  // Change 5 to your desired number
}
```

### Customize Notification UI

Edit `showSettings()` in `src/client/scripts/app.js` to modify the settings modal HTML.

### Change Offline Indicator Position

Edit `setupOfflineIndicator()` in `src/client/scripts/app.js`:

```javascript
indicator.style.cssText = `
  position: fixed; bottom: 80px; // Change position here
  ...
`;
```

### Modify Cache Strategy

Edit fetch event handler in `public/sw.js`:

```javascript
// Example: Change to Network First for all assets
event.respondWith(
  fetch(event.request)
    .then((response) => {
      // Cache then return
      return response;
    })
    .catch(() => caches.match(event.request))
);
```

---

## ✅ Best Practices

1. **Always test offline** - Use DevTools offline mode
2. **Monitor cache size** - Check regularly in DevTools
3. **Version carefully** - Build hash handles this automatically
4. **Test updates** - Verify update flow works
5. **Check console** - Service worker logs important info
6. **Use HTTPS** - Required for service workers
7. **Test on mobile** - Different behavior than desktop
8. **Handle errors** - All async operations have try/catch
9. **Provide feedback** - Toast notifications for user actions
10. **Document changes** - Update this guide when modifying

---

## 🆘 Getting Help

### Check Logs

1. Open DevTools Console
2. Look for `[Service Worker]` messages
3. Check for errors or warnings

### Inspect State

1. DevTools > Application
2. Check Service Workers tab
3. Check Cache Storage
4. Check Local Storage

### Common Issues

- See "Troubleshooting" section above
- Check `PWA_ENHANCEMENTS.md` for detailed guides
- Review browser console for errors

---

## 📝 Changelog

### Version 2.0.0 (Current)

- ✅ Dynamic cache versioning
- ✅ Background sync
- ✅ Notification preferences
- ✅ Notification grouping
- ✅ App shortcuts
- ✅ Smart install prompt
- ✅ Update notification
- ✅ Offline indicator
- ✅ Smart cache eviction
- ✅ Settings modal UI

---

**Last Updated:** 2026-01-10
**Maintained By:** Development Team
