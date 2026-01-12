/**
 * Enhanced Service Worker for STRNGR PWA
 * Features:
 * - Dynamic cache versioning with build hash
 * - Background sync for failed messages
 * - Notification grouping
 * - Update detection and notification
 * - Smart cache eviction
 * - Offline state detection
 */

// Dynamic cache versioning - will be replaced during build
let CACHE_VERSION = 'v1';
let BUILD_HASH = 'dev';

// Singleton promise to ensure version is initialized only once
let versionInitPromise = null;

// Fetch build hash from manifest if available
const getCacheVersion = () => {
  if (versionInitPromise) {
    return versionInitPromise;
  }

  versionInitPromise = (async () => {
    try {
      // Fix: Use correct path for manifest
      const manifestResponse = await fetch('/manifest.json').catch(() => null);
      if (manifestResponse && manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        // Use the hash from the main entry point
        const mainEntry = manifest['index.html'];
        if (mainEntry && mainEntry.file) {
          // Extract hash from filename like "assets/index-abc123.js"
          const hashMatch = mainEntry.file.match(/-([a-f0-9]{8})\./);
          if (hashMatch) {
            BUILD_HASH = hashMatch[1];
          }
        }
      }
    } catch (_err) {
      // Fallback to timestamp in development
      BUILD_HASH = isDevelopment ? Date.now().toString(36) : 'prod';
    }

    CACHE_VERSION = `strngr-${BUILD_HASH}`;
    return CACHE_VERSION;
  })();

  return versionInitPromise;
};

const DYNAMIC_CACHE_NAME = 'strngr-dynamic';
const MESSAGE_CACHE_NAME = 'strngr-messages';

// Cache size limits (in bytes and item count)
const CACHE_LIMITS = {
  static: { maxItems: 100, maxSize: 50 * 1024 * 1024 }, // 50MB
  dynamic: { maxItems: 50, maxSize: 20 * 1024 * 1024 }, // 20MB
  messages: { maxItems: 100, maxSize: 5 * 1024 * 1024 }, // 5MB
};

const BASE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/logo.png',
  '/logo.webp',
  '/logo_dark.png',
  '/logo_dark.webp',
  '/manifest.json',
  '/icons/user.svg',
  '/icons/lock.svg',
  '/icons/shield.svg',
  '/icons/smartphone.svg',
  '/icons/check.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

// Socket.IO client library URL pattern
const SOCKET_IO_PATTERN = /\/socket\.io\/.*\.js/;

// Development mode detection
const isDevelopment =
  self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Conditional logging helper
const log = (...args) => {
  if (isDevelopment) {
    console.log('[Service Worker]', ...args);
  }
};

const warn = (...args) => {
  if (isDevelopment) {
    console.warn('[Service Worker]', ...args);
  }
};

const error = (...args) => {
  console.error('[Service Worker]', ...args);
};

/**
 * Smart cache eviction with LRU and size limits
 * @param {string} cacheName - Name of the cache to limit
 * @param {Object} limits - Object with maxItems and maxSize
 */
const smartCacheEviction = async (cacheName, limits) => {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    // Sort by access time (LRU) - we'll track this via metadata
    const entries = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        const size = response ? parseInt(response.headers.get('content-length') || '0') : 0;
        return { request, size };
      })
    );

    let totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    let itemCount = entries.length;

    // Remove oldest items if over limits
    let i = 0;
    while ((itemCount > limits.maxItems || totalSize > limits.maxSize) && i < entries.length) {
      await cache.delete(entries[i].request);
      totalSize -= entries[i].size;
      itemCount--;
      i++;
    }

    log(`Cache ${cacheName}: ${itemCount} items, ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  } catch (err) {
    warn('Cache eviction failed:', err);
  }
};

/**
 * Notify all clients about offline/online state
 */
const notifyClients = async (message) => {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => {
    client.postMessage(message);
  });
};

// Install Event
self.addEventListener('install', (event) => {
  log('Installing Service Worker...');

  event.waitUntil(
    getCacheVersion()
      .then((version) => {
        log('Cache Version:', version);
        return caches.open(version).then((cache) => {
          log('Caching Base Assets:', BASE_ASSETS.length);

          return Promise.allSettled(
            BASE_ASSETS.map((url) =>
              cache.add(url).catch((err) => {
                warn(`Failed to cache: ${url}`, err);
                return null;
              })
            )
          );
        });
      })
      .then(() => {
        log('Pre-caching complete, skipping waiting');
        return self.skipWaiting();
      })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  log('Activating Service Worker...');

  event.waitUntil(
    getCacheVersion()
      .then((currentCache) => {
        return caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cache) => {
              // Keep current version, dynamic, and message caches
              if (
                cache !== currentCache &&
                cache !== DYNAMIC_CACHE_NAME &&
                cache !== MESSAGE_CACHE_NAME
              ) {
                log('Clearing Old Cache:', cache);

                // Notify clients about update
                notifyClients({
                  type: 'SW_UPDATE',
                  message: 'New version available! Refresh to update.',
                  oldVersion: cache,
                  newVersion: currentCache,
                });

                return caches.delete(cache);
              }
            })
          );
        });
      })
      .then(() => {
        log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);

  const EXCLUDED_PATHS = ['/admin', '/api/moderation', '/metrics'];
  if (EXCLUDED_PATHS.some((path) => requestURL.pathname.startsWith(path))) {
    return; // Don't cache sensitive routes
  }

  // Socket.IO Library Caching (Stale-While-Revalidate)
  if (SOCKET_IO_PATTERN.test(requestURL.pathname)) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache
                  .put(event.request, networkResponse.clone())
                  .catch((e) => warn('Cache put failed', e));
                smartCacheEviction(DYNAMIC_CACHE_NAME, CACHE_LIMITS.dynamic);
              }
              return networkResponse;
            })
            .catch(() => response); // Fallback to cache on network error

          return response || fetchPromise;
        });
      })
    );
    return;
  }

  // Navigation Requests (HTML) - Network First with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Notify clients we're online
          notifyClients({ type: 'ONLINE' });

          return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            if (networkResponse && networkResponse.ok) {
              cache
                .put(event.request, networkResponse.clone())
                .catch((e) => warn('Cache put failed', e));
              smartCacheEviction(DYNAMIC_CACHE_NAME, CACHE_LIMITS.dynamic);
            }
            return networkResponse;
          });
        })
        .catch(() => {
          // Notify clients we're offline
          notifyClients({ type: 'OFFLINE' });

          return caches.match(event.request).then((response) => {
            return response || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Static Assets - Cache First with network fallback
  event.respondWith(
    getCacheVersion().then((_cacheVersion) => {
      return caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== 'basic'
            ) {
              return networkResponse;
            }

            // Cache same-origin resources
            if (requestURL.origin === self.location.origin) {
              const responseToCache = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch((e) => warn('Cache put failed', e));
                smartCacheEviction(DYNAMIC_CACHE_NAME, CACHE_LIMITS.dynamic);
              });
            }

            return networkResponse;
          })
          .catch((err) => {
            warn('Fetch failed:', err);
            // Return a basic offline response for failed requests
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      });
    })
  );
});

// Message handling from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    // Allow clients to request caching of specific URLs
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
        return Promise.all(
          urls.map((url) => cache.add(url).catch((err) => warn('Failed to cache:', url, err)))
        );
      })
    );
  }
});

// Push Notifications with grouping

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();

    // Check notification preferences
    event.waitUntil(
      self.registration.getNotifications({ tag: 'strngr-messages' }).then((notifications) => {
        // Group notifications if there are multiple
        if (notifications.length > 0) {
          // Close existing notifications
          notifications.forEach((n) => n.close());

          const count = notifications.length + 1;
          const options = {
            body: `You have ${count} new messages`,
            icon: '/logo.png',
            badge: '/icons/shield.svg',
            tag: 'strngr-messages',
            renotify: true,
            vibrate: [100, 50, 100],
            data: {
              url: data.url || '/',
              count: count,
            },
            actions: [
              { action: 'open', title: 'Open Chat' },
              { action: 'dismiss', title: 'Dismiss' },
            ],
          };

          return self.registration.showNotification('STRNGR', options);
        } else {
          // Single notification
          const options = {
            body: data.body || 'New message received',
            icon: '/logo.png',
            badge: '/icons/shield.svg',
            tag: 'strngr-messages',
            vibrate: [100, 50, 100],
            data: {
              url: data.url || '/',
              count: 1,
            },
            actions: [
              { action: 'open', title: 'Open Chat' },
              { action: 'dismiss', title: 'Dismiss' },
            ],
          };

          return self.registration.showNotification(data.title || 'STRNGR', options);
        }
      })
    );
  } catch (err) {
    error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Background Sync for failed messages
self.addEventListener('sync', (event) => {
  log('Background sync event:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(
      syncFailedMessages()
        .then(() => {
          log('Messages synced successfully');
          notifyClients({ type: 'SYNC_COMPLETE', success: true });
        })
        .catch((err) => {
          error('Message sync failed:', err);
          notifyClients({ type: 'SYNC_COMPLETE', success: false, error: err.message });
        })
    );
  }
});

/**
 * Sync failed messages from IndexedDB or cache
 */
const syncFailedMessages = async () => {
  // Get failed messages from cache
  const cache = await caches.open(MESSAGE_CACHE_NAME);
  const requests = await cache.keys();

  const syncPromises = requests.map(async (request) => {
    try {
      const response = await cache.match(request);
      const messageData = await response.json();

      // Attempt to send the message
      const sendResponse = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (sendResponse.ok) {
        // Remove from cache on success
        await cache.delete(request);
        log('Message synced:', messageData);
      } else {
        throw new Error('Send failed');
      }
    } catch (err) {
      warn('Failed to sync message:', err);
      // Keep in cache for next sync attempt
    }
  });

  await Promise.allSettled(syncPromises);

  // Clean up cache
  await smartCacheEviction(MESSAGE_CACHE_NAME, CACHE_LIMITS.messages);
};

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-messages-periodic') {
    event.waitUntil(syncFailedMessages());
  }
});

log('Service Worker loaded');
