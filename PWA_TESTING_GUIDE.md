# PWA Testing Guide

This guide provides comprehensive instructions for testing all Progressive Web App features of STRNGR.

## Table of Contents
1. [Service Worker Testing](#service-worker-testing)
2. [Installation Testing](#installation-testing)
3. [Offline Functionality](#offline-functionality)
4. [Push Notifications](#push-notifications)
5. [App Shortcuts](#app-shortcuts)
6. [Background Sync](#background-sync)
7. [Theme & Splash Screen](#theme--splash-screen)
8. [Mobile Testing](#mobile-testing)

---

## Service Worker Testing

### ✅ Verify Service Worker Registration

**Desktop (Chrome/Edge):**
1. Open DevTools (F12)
2. Go to **Application** tab → **Service Workers**
3. Verify service worker is registered and **activated**
4. Check that source is `/sw.js`
5. Verify scope is `/`

**Expected Result:** ✓ Service worker shows as "activated and is running"

### ✅ Test Service Worker Update

1. Open DevTools → Application → Service Workers
2. Check "Update on reload"
3. Make a small change to `public/sw.js` (e.g., add a comment)
4. Reload the page
5. Verify new service worker is installed
6. Check for update notification banner

**Expected Result:** ✓ Update banner appears with "Update Now" button

### ✅ Verify Cached Assets

1. Open DevTools → Application → Cache Storage
2. Expand cache entries (should see `strngr-*` caches)
3. Verify the following are cached:
   - `/` or `/index.html`
   - `/offline.html`
   - `/manifest.json`
   - `/logo.png`, `/logo.webp`
   - Font files from Google Fonts
   - SVG icons from `/icons/`

**Expected Result:** ✓ All critical assets are cached

### ✅ Test Cache Versioning

1. Check cache names in DevTools → Application → Cache Storage
2. Verify cache name includes version/hash (e.g., `strngr-abc123`)
3. Update the app (make a change)
4. Reload and verify old cache is deleted
5. New cache with different version should exist

**Expected Result:** ✓ Old caches are cleaned up automatically

---

## Installation Testing

### ✅ Desktop Installation (Chrome/Edge)

1. Open the app in Chrome/Edge
2. Look for install icon in address bar (⊕ or install icon)
3. Click the icon
4. Verify install dialog appears
5. Click "Install"
6. Verify app opens in standalone window
7. Check taskbar/dock for app icon

**Alternative Method:**
1. Interact with the page (click, scroll ~5 times)
2. Wait for install banner to appear at bottom
3. Click "Install" button
4. Verify installation

**Expected Result:** ✓ App installs and opens in standalone window

### ✅ Mobile Installation (Android Chrome)

1. Open the app on Android Chrome
2. Tap menu (⋮) → "Add to Home screen" or "Install app"
3. Confirm installation
4. Find app icon on home screen
5. Tap icon to launch
6. Verify app opens in fullscreen/standalone mode

**Expected Result:** ✓ App appears on home screen and launches standalone

### ✅ iOS Installation (Safari)

1. Open the app in Safari on iOS
2. Tap Share button (⬆)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. Find app icon on home screen
6. Tap to launch
7. Verify app opens without Safari UI

**Expected Result:** ✓ App appears on home screen with correct icon

### ✅ Verify Manifest.json

1. Navigate to `http://localhost:3000/manifest.json`
2. Verify JSON is valid
3. Check required fields:
   - `name`: "STRNGR | Talk. Anonymously."
   - `short_name`: "STRNGR"
   - `start_url`: "/"
   - `display`: "standalone"
   - `theme_color`: Valid hex color
   - `background_color`: Valid hex color
   - `icons`: Array with multiple sizes

**Expected Result:** ✓ Manifest is valid and complete

---

## Offline Functionality

### ✅ Test Offline Page Display

1. Open the app and wait for it to load completely
2. Open DevTools → Network tab
3. Check "Offline" checkbox
4. Try to navigate to a new page or refresh
5. Verify offline page appears with:
   - "Connection paused" heading
   - Offline icon (wifi-off)
   - "Reconnect" button

**Expected Result:** ✓ Offline page displays correctly

### ✅ Test Offline Indicator

1. Load the app normally
2. Open DevTools → Network → Check "Offline"
3. Verify offline indicator appears at bottom of screen
4. Should show "You're offline" message
5. Uncheck "Offline"
6. Verify indicator disappears

**Expected Result:** ✓ Offline indicator shows/hides correctly

### ✅ Test Cached Asset Loading

1. Load the app with network enabled
2. Wait for complete load (check Network tab)
3. Go to DevTools → Network → Check "Offline"
4. Reload the page
5. Verify page loads from cache
6. Check that images, CSS, and JS load correctly

**Expected Result:** ✓ Page loads completely from cache

### ✅ Test Network Recovery

1. Start offline (DevTools → Network → Offline)
2. Try to use the app
3. Uncheck "Offline" to go back online
4. Click "Reconnect" button or reload
5. Verify app reconnects to server
6. Test chat functionality works

**Expected Result:** ✓ App recovers and reconnects successfully

---

## Push Notifications

### ✅ Request Notification Permission

1. Open the app
2. Open Settings panel (gear icon)
3. Find notification toggle
4. Click to enable notifications
5. Verify custom permission prompt appears
6. Click "Enable Notifications"
7. Verify browser permission prompt appears
8. Click "Allow"

**Expected Result:** ✓ Permission granted, toast shows "Notifications enabled! 🔔"

### ✅ Verify Push Subscription

1. After granting permission, open DevTools
2. Go to Application → Service Workers
3. Check "Push" section
4. Verify subscription exists
5. Copy subscription endpoint

**Expected Result:** ✓ Push subscription is active

### ✅ Test Push Notification Display

**Using DevTools:**
1. Open DevTools → Application → Service Workers
2. Find your service worker
3. In "Push" section, enter test payload:
   ```json
   {"title": "Test", "body": "Test notification", "url": "/"}
   ```
4. Click "Push"
5. Verify notification appears

**Expected Result:** ✓ Notification displays with correct icon and actions

### ✅ Test Notification Click

1. Trigger a push notification (as above)
2. Click on the notification
3. Verify app window opens/focuses
4. If app was closed, verify it opens to correct URL

**Expected Result:** ✓ Clicking notification opens/focuses app

### ✅ Test Notification Grouping

1. Send multiple push notifications quickly
2. Verify they group together
3. Should show "You have X new messages"

**Expected Result:** ✓ Multiple notifications group correctly

---

## App Shortcuts

### ✅ Verify Shortcuts in Manifest

1. Open `http://localhost:3000/manifest.json`
2. Check `shortcuts` array
3. Verify shortcuts exist:
   - "Start Chat" → `/?action=chat`
   - "View Terms" → `/terms.html`

**Expected Result:** ✓ Shortcuts are defined correctly

### ✅ Test Shortcuts (Desktop)

1. Install the app on desktop
2. Right-click app icon in taskbar/dock
3. Verify shortcuts appear in context menu
4. Click "Start Chat" shortcut
5. Verify app opens and auto-starts chat

**Expected Result:** ✓ Shortcuts appear and work correctly

### ✅ Test Shortcuts (Android)

1. Install app on Android
2. Long-press app icon on home screen
3. Verify shortcuts appear
4. Tap "Start Chat"
5. Verify app opens and chat starts

**Expected Result:** ✓ Shortcuts work on mobile

### ✅ Test Shortcut URL Parameters

1. Navigate to `http://localhost:3000/?action=chat`
2. Verify TOS checkbox is auto-checked
3. Verify chat auto-starts after short delay

**Expected Result:** ✓ URL parameter triggers auto-start

---

## Background Sync

### ✅ Verify Background Sync Registration

1. Open DevTools → Console
2. Run:
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     reg.sync.register('sync-messages').then(() => {
       console.log('Sync registered');
     });
   });
   ```
3. Check console for success message

**Expected Result:** ✓ Sync registers without errors

### ✅ Test Background Sync Handler

1. Open DevTools → Application → Service Workers
2. In "Sync" section, enter tag: `sync-messages`
3. Click "Sync"
4. Check console for sync event logs
5. Verify `syncFailedMessages` function executes

**Expected Result:** ✓ Sync event triggers and executes

### ✅ Test Failed Message Sync

1. Start a chat
2. Go offline (DevTools → Network → Offline)
3. Try to send a message
4. Message should queue
5. Go back online
6. Verify background sync triggers
7. Message should send automatically

**Expected Result:** ✓ Failed messages sync when back online

### ✅ Verify Periodic Sync (Chrome Only)

1. Check if periodic sync is registered:
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     if ('periodicSync' in reg) {
       reg.periodicSync.getTags().then(tags => {
         console.log('Periodic sync tags:', tags);
       });
     }
   });
   ```
2. Should see `sync-messages-periodic` tag

**Expected Result:** ✓ Periodic sync is registered (Chrome 80+)

---

## Theme & Splash Screen

### ✅ Test Theme Color

1. Open the app
2. Check browser UI color (address bar on mobile)
3. Should match theme color from manifest
4. Toggle dark/light theme
5. Verify theme color updates

**Expected Result:** ✓ Theme color matches and updates

### ✅ Test Splash Screen (Mobile)

1. Install app on mobile device
2. Close the app completely
3. Tap app icon to launch
4. Observe splash screen while loading
5. Should show:
   - Background color from manifest
   - App icon
   - App name

**Expected Result:** ✓ Splash screen displays correctly

### ✅ Verify Theme Meta Tag

1. View page source
2. Find `<meta name="theme-color">`
3. Verify content is valid hex color
4. Should match manifest `theme_color`

**Expected Result:** ✓ Theme meta tag is present and correct

### ✅ Test Theme Persistence

1. Toggle theme to dark mode
2. Reload the page
3. Verify dark mode persists
4. Close and reopen app
5. Verify theme is still dark

**Expected Result:** ✓ Theme preference persists across sessions

---

## Mobile Testing

### ✅ Test on Real Devices

**iOS (Safari):**
- [ ] iPhone SE (small screen)
- [ ] iPhone 12/13/14 (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] iPad (tablet)

**Android (Chrome):**
- [ ] Small phone (< 375px width)
- [ ] Standard phone (375-414px)
- [ ] Large phone (> 414px)
- [ ] Tablet

### ✅ Test Viewport Settings

1. Open on mobile device
2. Try to zoom in/out
3. Should prevent excessive zoom on input focus
4. Verify responsive layout works

**Expected Result:** ✓ Viewport is properly configured

### ✅ Test Touch Interactions

1. Test all buttons (minimum 44x44px touch targets)
2. Test swipe gestures (if implemented)
3. Test pull-to-refresh
4. Verify haptic feedback on button taps

**Expected Result:** ✓ Touch interactions work smoothly

### ✅ Test Standalone Mode

1. Install app on mobile
2. Launch from home screen
3. Verify no browser UI (address bar, etc.)
4. Should feel like native app
5. Test navigation within app

**Expected Result:** ✓ App runs in standalone mode

### ✅ Test iOS-Specific Features

1. Verify apple-touch-icon is set
2. Check status bar style
3. Test safe area insets (notch devices)
4. Verify no bounce scroll issues

**Expected Result:** ✓ iOS-specific features work correctly

---

## Automated Testing

### Run PWA Test Suite

```bash
npm test -- pwa-features.test.js
```

This will run all automated PWA tests including:
- Service worker registration
- Installation prompts
- Offline functionality
- Caching strategies
- Push notifications
- App shortcuts
- Background sync
- Theme colors

### Run Lighthouse Audit

```bash
npx lighthouse http://localhost:3000 --view
```

Check PWA score (should be 90+):
- [ ] Installable
- [ ] PWA optimized
- [ ] Works offline
- [ ] Configured for custom splash screen
- [ ] Sets theme color
- [ ] Content sized correctly for viewport

---

## Troubleshooting

### Service Worker Not Registering
- Check console for errors
- Verify `/sw.js` is accessible
- Ensure HTTPS (or localhost)
- Clear cache and hard reload

### Install Prompt Not Showing
- Check if already installed
- Verify manifest.json is valid
- Ensure all install criteria met
- Try incognito mode

### Offline Page Not Showing
- Verify service worker is active
- Check cache storage for offline.html
- Test with DevTools offline mode
- Clear cache and re-test

### Push Notifications Not Working
- Verify permission granted
- Check VAPID keys configured
- Ensure service worker active
- Test with DevTools push

### Background Sync Failing
- Check browser support (Chrome/Edge)
- Verify sync event handler in SW
- Check console for errors
- Test with DevTools sync

---

## Testing Checklist Summary

### Critical Tests
- [x] Service worker registers successfully
- [x] App is installable
- [x] Offline page displays when offline
- [x] Cached assets load offline
- [x] Manifest.json is valid
- [x] Theme color works
- [x] Icons display correctly

### Important Tests
- [ ] Push notifications work
- [ ] App shortcuts function
- [ ] Background sync operates
- [ ] Update detection works
- [ ] Cache management functions
- [ ] Mobile installation works

### Nice-to-Have Tests
- [ ] Periodic sync (Chrome only)
- [ ] Notification grouping
- [ ] Haptic feedback
- [ ] Splash screen appearance
- [ ] iOS-specific features

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Install Prompt | ✅ | ❌ | ❌* | ✅ |
| Push Notifications | ✅ | ✅ | ✅** | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |
| Periodic Sync | ✅ | ❌ | ❌ | ✅ |
| App Shortcuts | ✅ | ❌ | ❌ | ✅ |

\* Safari uses "Add to Home Screen" instead  
\*\* Safari 16.4+ on iOS/macOS

---

## Performance Benchmarks

Expected Lighthouse scores:
- **Performance:** 90+
- **Accessibility:** 95+
- **Best Practices:** 95+
- **SEO:** 100
- **PWA:** 100

---

## Next Steps

After completing all tests:
1. Document any issues found
2. Fix critical bugs
3. Optimize performance
4. Test on production domain
5. Monitor real-world usage
6. Collect user feedback

---

**Last Updated:** 2026-01-12  
**Version:** 1.0
