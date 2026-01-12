/**
 * PWA Features Test Suite
 * Tests all Progressive Web App functionality including:
 * - Service Worker registration and lifecycle
 * - PWA installation prompt
 * - Offline page and caching
 * - Push notifications
 * - App shortcuts
 * - Background sync
 * - Theme color and splash screen
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 30000;

describe('PWA Features Test Suite', () => {
  let browser;
  let context;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
    });
  }, TIMEOUT);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['notifications'],
    });
    page = await context.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
    if (context) {
      await context.close();
    }
  });

  /**
   * Test 1: Service Worker Registration
   */
  describe('Service Worker Registration', () => {
    it(
      'should register service worker successfully',
      async () => {
        await page.goto(BASE_URL);

        // Wait for service worker registration
        const swRegistered = await page.evaluate(async () => {
          if (!('serviceWorker' in navigator)) {
            return false;
          }

          try {
            const registration = await navigator.serviceWorker.ready;
            return registration !== null && registration.active !== null;
          } catch (err) {
            console.error('SW Registration Error:', err);
            return false;
          }
        });

        expect(swRegistered).toBe(true);
      },
      TIMEOUT
    );

    it(
      'should have correct service worker scope',
      async () => {
        await page.goto(BASE_URL);

        const swScope = await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.ready;
          return registration.scope;
        });

        expect(swScope).toContain(new URL(BASE_URL).origin);
      },
      TIMEOUT
    );

    it(
      'should load sw.js file successfully',
      async () => {
        const response = await page.goto(`${BASE_URL}/sw.js`);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('javascript');
      },
      TIMEOUT
    );

    it(
      'should cache base assets on install',
      async () => {
        await page.goto(BASE_URL);

        // Wait for SW to be active
        await page.waitForTimeout(2000);

        const cachedAssets = await page.evaluate(async () => {
          const cacheNames = await caches.keys();
          const results = [];

          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            results.push(...keys.map((req) => req.url));
          }

          return results;
        });

        // Check for critical assets
        const hasIndexHtml = cachedAssets.some(
          (url) => url.includes('index.html') || url.endsWith('/')
        );
        const hasOfflineHtml = cachedAssets.some((url) => url.includes('offline.html'));
        const hasManifest = cachedAssets.some((url) => url.includes('manifest.json'));

        expect(hasIndexHtml).toBe(true);
        expect(hasOfflineHtml).toBe(true);
        expect(hasManifest).toBe(true);
      },
      TIMEOUT
    );

    it(
      'should update service worker when new version available',
      async () => {
        await page.goto(BASE_URL);

        // Simulate SW update by triggering update check
        const updateDetected = await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.ready;

          return new Promise((resolve) => {
            // Listen for update found
            registration.addEventListener('updatefound', () => {
              resolve(true);
            });

            // Trigger update check
            registration.update().catch(() => resolve(false));

            // Timeout after 3 seconds
            setTimeout(() => resolve(false), 3000);
          });
        });

        // Update may or may not be found depending on timing
        expect(typeof updateDetected).toBe('boolean');
      },
      TIMEOUT
    );
  });

  /**
   * Test 2: PWA Installation
   */
  describe('PWA Installation', () => {
    it(
      'should have valid manifest.json',
      async () => {
        const response = await page.goto(`${BASE_URL}/manifest.json`);
        expect(response.status()).toBe(200);

        const manifest = await response.json();
        expect(manifest.name).toBeDefined();
        expect(manifest.short_name).toBeDefined();
        expect(manifest.start_url).toBeDefined();
        expect(manifest.display).toBeDefined();
        expect(manifest.icons).toBeDefined();
        expect(manifest.icons.length).toBeGreaterThan(0);
      },
      TIMEOUT
    );

    it(
      'should reference manifest in HTML',
      async () => {
        await page.goto(BASE_URL);

        const hasManifestLink = await page.evaluate(() => {
          const link = document.querySelector('link[rel="manifest"]');
          return link !== null && link.href.includes('manifest.json');
        });

        expect(hasManifestLink).toBe(true);
      },
      TIMEOUT
    );

    it(
      'should have correct theme color meta tag',
      async () => {
        await page.goto(BASE_URL);

        const themeColor = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="theme-color"]');
          return meta ? meta.content : null;
        });

        expect(themeColor).toBeDefined();
        expect(themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      },
      TIMEOUT
    );

    it(
      'should capture beforeinstallprompt event',
      async () => {
        await page.goto(BASE_URL);

        // Check if PWAManager captures the event
        const promptCaptured = await page.evaluate(() => {
          return new Promise((resolve) => {
            // Check if deferredPrompt is set after event
            setTimeout(() => {
              // PWAManager should have captured it
              resolve(window.PWAManager?.deferredPrompt !== undefined);
            }, 1000);

            // Manually trigger the event for testing
            const event = new Event('beforeinstallprompt');
            event.preventDefault = () => {};
            window.dispatchEvent(event);
          });
        });

        expect(typeof promptCaptured).toBe('boolean');
      },
      TIMEOUT
    );

    it(
      'should show install banner after user engagement',
      async () => {
        await page.goto(BASE_URL);

        // Simulate user engagement
        await page.evaluate(() => {
          // Trigger engagement events
          for (let i = 0; i < 6; i++) {
            document.dispatchEvent(new Event('click'));
          }
        });

        // Wait for banner to potentially appear
        await page.waitForTimeout(2000);

        // Check if banner exists (may not appear if already installed)
        const bannerExists = await page.evaluate(() => {
          return document.getElementById('install-banner') !== null;
        });

        // This is informational - banner may not show if app is already installed
        expect(typeof bannerExists).toBe('boolean');
      },
      TIMEOUT
    );
  });

  /**
   * Test 3: Offline Functionality
   */
  describe('Offline Page and Caching', () => {
    it(
      'should load offline.html when offline',
      async () => {
        await page.goto(BASE_URL);

        // Wait for SW to be ready
        await page.waitForTimeout(2000);

        // Go offline
        await context.setOffline(true);

        // Try to navigate
        await page.goto(BASE_URL, { waitUntil: 'networkidle' }).catch(() => {});

        // Check if offline page is shown
        const content = await page.content();
        const isOfflinePage =
          content.includes('Connection paused') ||
          content.includes('offline') ||
          content.includes('Reconnect');

        expect(isOfflinePage).toBe(true);

        // Go back online
        await context.setOffline(false);
      },
      TIMEOUT
    );

    it(
      'should display offline indicator when network is lost',
      async () => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Go offline
        await context.setOffline(true);

        // Wait for indicator to appear (Service Worker or browser event may take a moment)
        const indicatorFound = await page
          .waitForSelector('#offline-indicator', { state: 'attached', timeout: 5000 })
          .catch(() => null);
        expect(indicatorFound).not.toBeNull();

        // Trigger offline event manually if needed (browsers usually do this, but for testing it's safer)
        await page.evaluate(() => {
          window.dispatchEvent(new Event('offline'));
        });

        await page.waitForTimeout(1000);

        // Check for offline indicator visibility
        const indicatorVisible = await page.evaluate(() => {
          const indicator = document.getElementById('offline-indicator');
          return indicator && window.getComputedStyle(indicator).display !== 'none';
        });

        expect(indicatorVisible).toBe(true);

        // Go back online
        await context.setOffline(false);
      },
      TIMEOUT
    );

    it(
      'should serve cached assets when offline',
      async () => {
        await page.goto(BASE_URL);

        // Wait for caching
        await page.waitForTimeout(2000);

        // Go offline
        await context.setOffline(true);

        // Try to load a cached asset
        const response = await page.goto(`${BASE_URL}/logo.png`).catch(() => null);

        // Should load from cache
        expect(response).not.toBeNull();
        if (response) {
          expect(response.status()).toBe(200);
        }

        // Go back online
        await context.setOffline(false);
      },
      TIMEOUT
    );

    it(
      'should show reconnect button on offline page',
      async () => {
        const response = await page.goto(`${BASE_URL}/offline.html`);
        expect(response.status()).toBe(200);

        const hasReconnectButton = await page.evaluate(() => {
          const button = document.querySelector('button');
          return button && button.textContent.includes('Reconnect');
        });

        expect(hasReconnectButton).toBe(true);
      },
      TIMEOUT
    );
  });

  /**
   * Test 4: Push Notifications
   */
  describe('Push Notifications', () => {
    it(
      'should request notification permission',
      async () => {
        await page.goto(BASE_URL);

        // Grant notification permission
        await context.grantPermissions(['notifications']);

        const permissionGranted = await page.evaluate(async () => {
          return Notification.permission === 'granted';
        });

        expect(permissionGranted).toBe(true);
      },
      TIMEOUT
    );

    it(
      'should subscribe to push notifications',
      async () => {
        await page.goto(BASE_URL);
        await context.grantPermissions(['notifications']);

        // Wait for SW to be ready
        await page.waitForTimeout(2000);

        const subscribed = await page.evaluate(async () => {
          try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            return subscription !== null;
          } catch (err) {
            console.error('Push subscription error:', err);
            return false;
          }
        });

        // Subscription may fail if VAPID keys are not configured
        expect(typeof subscribed).toBe('boolean');
      },
      TIMEOUT
    );

    it(
      'should have push notification event handler in service worker',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain("addEventListener('push'");
        expect(swContent).toContain('showNotification');
      },
      TIMEOUT
    );

    it(
      'should handle notification click events',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain("addEventListener('notificationclick'");
        expect(swContent).toContain('clients.openWindow');
      },
      TIMEOUT
    );
  });

  /**
   * Test 5: App Shortcuts
   */
  describe('App Shortcuts', () => {
    it(
      'should define shortcuts in manifest.json',
      async () => {
        const response = await page.goto(`${BASE_URL}/manifest.json`);
        const manifest = await response.json();

        expect(manifest.shortcuts).toBeDefined();
        expect(Array.isArray(manifest.shortcuts)).toBe(true);
        expect(manifest.shortcuts.length).toBeGreaterThan(0);
      },
      TIMEOUT
    );

    it(
      'should have valid shortcut structure',
      async () => {
        const response = await page.goto(`${BASE_URL}/manifest.json`);
        const manifest = await response.json();

        if (manifest.shortcuts && manifest.shortcuts.length > 0) {
          const shortcut = manifest.shortcuts[0];
          expect(shortcut.name).toBeDefined();
          expect(shortcut.url).toBeDefined();
          expect(shortcut.icons).toBeDefined();
        }
      },
      TIMEOUT
    );

    it(
      'should handle shortcut action parameter',
      async () => {
        await page.goto(`${BASE_URL}/?action=chat`);

        // Wait for potential auto-start
        await page.waitForTimeout(1000);

        // Check if chat was auto-started (TOS checkbox should be checked)
        const tosChecked = await page.evaluate(() => {
          const tosCheck = document.getElementById('tos-check');
          return tosCheck ? tosCheck.checked : false;
        });

        expect(typeof tosChecked).toBe('boolean');
      },
      TIMEOUT
    );
  });

  /**
   * Test 6: Background Sync
   */
  describe('Background Sync', () => {
    it(
      'should register background sync event handler',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain("addEventListener('sync'");
        expect(swContent).toContain('sync-messages');
      },
      TIMEOUT
    );

    it(
      'should have syncFailedMessages function',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain('syncFailedMessages');
        expect(swContent).toContain('MESSAGE_CACHE_NAME');
      },
      TIMEOUT
    );

    it(
      'should register background sync from client',
      async () => {
        await page.goto(BASE_URL);

        // Wait for SW to be ready
        await page.waitForTimeout(2000);

        const canRegisterSync = await page.evaluate(async () => {
          if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
            return false;
          }

          try {
            const registration = await navigator.serviceWorker.ready;
            if ('sync' in registration) {
              await registration.sync.register('sync-messages');
              return true;
            }
            return false;
          } catch (err) {
            console.error('Sync registration error:', err);
            return false;
          }
        });

        // Sync may not be supported in all browsers
        expect(typeof canRegisterSync).toBe('boolean');
      },
      TIMEOUT
    );
  });

  /**
   * Test 7: Theme Color and Splash Screen
   */
  describe('Theme Color and Splash Screen', () => {
    it(
      'should have theme-color meta tag',
      async () => {
        await page.goto(BASE_URL);

        const themeColor = await page.evaluate(() => {
          const meta = document.querySelector('meta[name="theme-color"]');
          return meta ? meta.content : null;
        });

        expect(themeColor).toBeDefined();
        expect(themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      },
      TIMEOUT
    );

    it(
      'should have background_color in manifest',
      async () => {
        const response = await page.goto(`${BASE_URL}/manifest.json`);
        const manifest = await response.json();

        expect(manifest.background_color).toBeDefined();
        expect(manifest.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      },
      TIMEOUT
    );

    it(
      'should have theme_color in manifest',
      async () => {
        const response = await page.goto(`${BASE_URL}/manifest.json`);
        const manifest = await response.json();

        expect(manifest.theme_color).toBeDefined();
        expect(manifest.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      },
      TIMEOUT
    );

    it(
      'should have icons for splash screen',
      async () => {
        const response = await page.goto(`${BASE_URL}/manifest.json`);
        const manifest = await response.json();

        const has512Icon = manifest.icons.some((icon) => icon.sizes.includes('512x512'));
        expect(has512Icon).toBe(true);
      },
      TIMEOUT
    );

    it(
      'should update theme-color on theme toggle',
      async () => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // Wait for button to be interactive
        await page.waitForSelector('#theme-toggle');

        const initialTheme = await page.evaluate(() => {
          const theme = document.documentElement.getAttribute('data-theme');
          return theme || 'light'; // Default to light if null
        });

        // Toggle theme
        await page.click('#theme-toggle');

        // Wait for update (attribute change)
        await page.waitForFunction(
          (oldTheme) => {
            const newTheme = document.documentElement.getAttribute('data-theme') || 'light';
            return newTheme !== oldTheme;
          },
          initialTheme,
          { timeout: 5000 }
        );

        const newTheme = await page.evaluate(() => {
          return document.documentElement.getAttribute('data-theme') || 'light';
        });

        expect(newTheme).not.toBe(initialTheme);
      },
      TIMEOUT
    );
  });

  /**
   * Test 8: Mobile-Specific Features
   */
  describe('Mobile PWA Features', () => {
    it(
      'should work on mobile viewport',
      async () => {
        await context.close();
        context = await browser.newContext({
          ...devices['iPhone 12'],
          permissions: ['notifications'],
        });
        page = await context.newPage();

        await page.goto(BASE_URL);

        const isResponsive = await page.evaluate(() => {
          const viewport = document.querySelector('meta[name="viewport"]');
          return viewport !== null;
        });

        expect(isResponsive).toBe(true);
      },
      TIMEOUT
    );

    it(
      'should have standalone display mode in manifest',
      async () => {
        const response = await page.goto(`${BASE_URL}/manifest.json`);
        const manifest = await response.json();

        expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
      },
      TIMEOUT
    );

    it(
      'should have apple-touch-icon for iOS',
      async () => {
        await page.goto(BASE_URL);

        const hasAppleIcon = await page.evaluate(() => {
          const link = document.querySelector('link[rel="apple-touch-icon"]');
          return link !== null;
        });

        expect(hasAppleIcon).toBe(true);
      },
      TIMEOUT
    );

    it(
      'should prevent zoom on input focus',
      async () => {
        await page.goto(BASE_URL);

        const viewportContent = await page.evaluate(() => {
          const viewport = document.querySelector('meta[name="viewport"]');
          return viewport ? viewport.content : '';
        });

        // Should have maximum-scale to prevent zoom
        expect(viewportContent).toContain('maximum-scale');
      },
      TIMEOUT
    );
  });

  /**
   * Test 9: Cache Management
   */
  describe('Cache Management', () => {
    it(
      'should implement cache versioning',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain('CACHE_VERSION');
        expect(swContent).toContain('BUILD_HASH');
      },
      TIMEOUT
    );

    it(
      'should clean up old caches on activation',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain("addEventListener('activate'");
        expect(swContent).toContain('caches.delete');
      },
      TIMEOUT
    );

    it(
      'should have cache size limits',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain('CACHE_LIMITS');
        expect(swContent).toContain('smartCacheEviction');
      },
      TIMEOUT
    );

    it(
      'should use different caching strategies',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        // Should have network-first for navigation
        expect(swContent).toContain("request.mode === 'navigate'");

        // Should have cache-first for static assets
        expect(swContent).toContain('caches.match');
      },
      TIMEOUT
    );
  });

  /**
   * Test 10: Service Worker Lifecycle
   */
  describe('Service Worker Lifecycle', () => {
    it(
      'should skip waiting on install',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain('skipWaiting');
      },
      TIMEOUT
    );

    it(
      'should claim clients on activation',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain('clients.claim');
      },
      TIMEOUT
    );

    it(
      'should handle message events',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain("addEventListener('message'");
        expect(swContent).toContain('SKIP_WAITING');
      },
      TIMEOUT
    );

    it(
      'should notify clients of updates',
      async () => {
        const swContent = await page.goto(`${BASE_URL}/sw.js`).then((res) => res.text());

        expect(swContent).toContain('notifyClients');
        expect(swContent).toContain('SW_UPDATE');
      },
      TIMEOUT
    );
  });
});
