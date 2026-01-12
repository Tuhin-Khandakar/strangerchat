import '../styles/main.css';
import '../styles/pwa-enhancements.css';
import { showToast, logError } from './utils.js';
import { SettingsManager } from './settings.js';
import { SoundManager } from './sound.js';

const isDev = import.meta.env.DEV;
const log = (...args) => {
  if (isDev) {
    console.log('[App]', ...args);
  }
};
const warn = (...args) => {
  if (isDev) {
    console.warn('[App]', ...args);
  }
};

// Global Error Handling
const handleGlobalError = (type, error, message) => {
  const errorMsg = message || error?.message || 'A small glitch occurred.';
  showToast(errorMsg, 'error');
  logError(type, error);

  if (import.meta.env.DEV) {
    console.error(`[${type}]`, error);
  }
};

window.addEventListener('error', (event) => {
  handleGlobalError('CLIENT_ERROR', event.error, 'A small glitch occurred. One moment...');
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalError('PROMISE_REJECTION', event.reason, 'Connection problem. Retrying...');
});

/**
 * BROWSER FEATURE DETECTION & GRACEFUL DEGRADATION
 */
const checkBrowserSupport = () => {
  const requiredFeatures = {
    WebSockets: 'WebSocket' in window,
    'Web Crypto': 'crypto' in window && 'subtle' in window.crypto,
    LocalStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
  };

  const missingFeatures = Object.entries(requiredFeatures)
    .filter(([_, supported]) => !supported)
    .map(([name]) => name);

  if (missingFeatures.length > 0) {
    const mainContent = document.querySelector('main') || document.body;
    const warning = document.createElement('div');
    warning.className = 'browser-warning glass-panel';
    warning.style.cssText =
      'position:fixed; inset:0; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg-white); padding:2rem; text-align:center;';
    warning.innerHTML = `
      <h1 style="color:var(--danger); margin-bottom:1rem;">Update Your Browser</h1>
      <p style="margin-bottom:1.5rem;">STRNGR uses modern tech your browser doesn't support: <strong>${missingFeatures.join(', ')}</strong></p>
      <a href="https://browsehappy.com" target="_blank" class="start-btn" style="text-decoration:none; display:inline-block; padding:1rem 2rem;">Upgrade Browser</a>
    `;
    document.body.appendChild(warning);
    return false;
  }
  return true;
};

if (!checkBrowserSupport()) {
  // Stop further initialization if critical features missing
  throw new Error('Unsupported browser');
}

/**
 * GLOBAL APP STATE & THEME MANAGEMENT
 */

const htmlRoot = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeToggleChat = document.getElementById('theme-toggle-chat');

function initThemeLogic() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    htmlRoot.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // system default
  }
}

async function toggleThemeLogic() {
  const currentTheme = htmlRoot.getAttribute('data-theme');
  let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  if (!currentTheme) {
    newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
  }
  htmlRoot.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  const { announce } = await import('./utils.js');
  announce(`Theme switched to ${newTheme} mode`);
}

if (themeToggle) {
  themeToggle.addEventListener('click', toggleThemeLogic);
}
if (themeToggleChat) {
  themeToggleChat.addEventListener('click', toggleThemeLogic);
}
initThemeLogic();

// Landing Page Logic
const landingScreen = document.getElementById('landing-screen');
const chatScreen = document.getElementById('chat-screen');
const startBtn = document.getElementById('start-btn');
const tosCheck = document.getElementById('tos-check');
const onlineCount = document.getElementById('online-count');

if (tosCheck) {
  tosCheck.addEventListener('change', () => {
    startBtn.disabled = !tosCheck.checked;
  });
}

// Poll for online count
async function updateOnlineCount() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && onlineCount) {
        onlineCount.textContent = `Online: ${data.online}`;
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(e);
    }
  }
}
setInterval(updateOnlineCount, 30000);
updateOnlineCount();

const startChat = async () => {
  if (startBtn) {
    startBtn.innerHTML = '<span class="loading-spinner"></span> Connecting...';
    startBtn.disabled = true;
  }
  showToast('Creating a space for you...', 'info');

  try {
    const { initChat } = await import('./chat.js');

    if (landingScreen) {
      landingScreen.classList.remove('active');
    }
    if (chatScreen) {
      chatScreen.classList.add('active');
      chatScreen.focus();
    }

    initChat({
      chatBox: document.getElementById('chat-box'),
      msgInput: document.getElementById('msg-input'),
      sendBtn: document.getElementById('send-btn'),
      nextBtn: document.getElementById('next-btn'),
      chatStatus: document.getElementById('chat-status'),
      typingUI: document.getElementById('typing-ui'),
      reportBtn: document.getElementById('report-btn'),
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Failed to load chat module:', err);
    }
    showToast('Failed to load chat. Please refresh.', 'error');
    if (startBtn) {
      startBtn.innerHTML = '👉 Start Chatting';
      startBtn.disabled = false;
    }
  }
};

if (startBtn) {
  startBtn.addEventListener('click', startChat);
}

// Auto-restore session if state exists
window.addEventListener('DOMContentLoaded', () => {
  const savedState = sessionStorage.getItem('strngr_chat_state');
  if (savedState) {
    try {
      const { messages } = JSON.parse(savedState);
      if (messages && messages.length > 0) {
        startChat();
      }
    } catch (e) {
      logError('SESSION_RESTORE_ERROR', e);
      sessionStorage.removeItem('strngr_chat_state');
    }
  }
});

// Initialize Theme & Sound
SoundManager.init();

// Settings Manager is initialized at the end after dependencies are ready

// Performance Monitoring
const PerformanceMonitor = {
  init() {
    // Observe LCP
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.log('LCP', entry.startTime, entry.id);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // Observe FID
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.log('FID', entry.processingStart - entry.startTime, entry.id);
      }
    }).observe({ type: 'first-input', buffered: true });

    // Observe CLS
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          this.log('CLS', entry.value, entry.id);
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });

    // Monitor API Latency (Monkey patch fetch)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await originalFetch(...args);
      const duration = performance.now() - start;
      this.log('API_LATENCY', duration, args[0].toString());
      return response;
    };

    // Observe Long Tasks (TBT proxy)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.log('LONG_TASK', entry.duration, entry.name);
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (_e) {
        // Not supported in all browsers (e.g. Firefox)
      }
    }
  },

  log(name, value, id) {
    if (import.meta.env.DEV) {
      console.log(`[Perf] ${name}:`, value);
    }
    // Batch or send immediately
    // Using sendBeacon for minimal impact
    const data = JSON.stringify({ name, value, id });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/logs/perf', data);
    }
  },
};
PerformanceMonitor.init();

// Feedback Manager
const FeedbackManager = {
  modal: null,

  show() {
    if (this.modal) {
      this.modal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal'; // Reuse settings modal styles
    this.modal.innerHTML = `
      <div class="settings-overlay"></div>
      <div class="settings-content glass-panel">
        <div class="settings-header">
          <h2>Report a Bug</h2>
          <button class="settings-close">&times;</button>
        </div>
        <div class="settings-body">
           <div class="settings-section">
             <label style="display:block; margin-bottom: 8px;">What happened?</label>
             <textarea id="feedback-text" rows="5" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; background: rgba(255,255,255,0.1); color: inherit;" placeholder="Describe the bug or feedback..."></textarea>
           </div>
           <div class="settings-actions">
             <button class="settings-action-btn primary" id="submit-feedback-btn">Submit Report</button>
           </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Events
    this.modal.querySelector('.settings-close').onclick = () => this.hide();
    this.modal.querySelector('.settings-overlay').onclick = () => this.hide();

    const submitBtn = this.modal.querySelector('#submit-feedback-btn');
    submitBtn.onclick = async () => {
      const text = this.modal.querySelector('#feedback-text').value;
      if (!text || text.trim().length < 5) {
        showToast('Please provide more details.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bug',
            text,
            additionalData: {
              url: window.location.href,
              userAgent: navigator.userAgent,
              screen: { w: window.screen.width, h: window.screen.height },
            },
          }),
        });
        showToast('Thanks for your feedback!', 'success');
        this.hide();
      } catch (_e) {
        showToast('Failed to send report.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
      }
    };
  },

  hide() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  },
};

// PWA & Mobile Enhancements
const PWAManager = {
  deferredPrompt: null,
  userEngagement: 0,
  installPromptShown: false,
  notificationPreferences: null,

  init() {
    // Progressive Enhancement: Check support
    if (!('serviceWorker' in navigator)) {
      if (import.meta.env.DEV) {
        console.log('Service Worker not supported');
      }
      this.updateUIForNoPWA();
      return;
    }

    this.loadNotificationPreferences();
    this.setupInstallPrompt();
    this.setupTouchInteractions();
    this.setupBackgroundSync();
    this.setupViewportFix();
    this.setupServiceWorkerListeners();
    this.setupUpdateDetection();
    this.setupOfflineIndicator();
    this.handleAppShortcuts();
    this.trackUserEngagement();

    // Expose helper
    window.vibrate = (pattern = 15) => {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    };
  },

  async promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Installing...', 'info');
      }
      return outcome;
    }
    return null;
  },

  updateUIForNoPWA() {
    // Hide install and notification controls
    const installBtn = document.getElementById('install-app-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }

    // Disable notification toggles if Push API missing, even if SW exists
    if (!('PushManager' in window)) {
      const triggers = document.querySelectorAll('[id^="notif-"]');
      triggers.forEach((t) => {
        t.disabled = true;
        t.closest('.settings-toggle').title = 'Not supported in this browser';
      });
    }
  },

  /**
   * Load notification preferences from localStorage
   */
  loadNotificationPreferences() {
    const saved = localStorage.getItem('strngr_notification_prefs');
    this.notificationPreferences = saved
      ? JSON.parse(saved)
      : {
          enabled: false,
          messages: true,
          matches: true,
          system: false,
        };
  },

  /**
   * Save notification preferences
   */
  saveNotificationPreferences() {
    localStorage.setItem('strngr_notification_prefs', JSON.stringify(this.notificationPreferences));
  },

  /**
   * Track user engagement to show install prompt at right time
   */
  trackUserEngagement() {
    const engagementEvents = ['click', 'scroll', 'keydown'];
    const trackEngagement = () => {
      this.userEngagement++;

      // Show install prompt after meaningful engagement (e.g., 5 interactions)
      if (this.userEngagement >= 5 && !this.installPromptShown && this.deferredPrompt) {
        setTimeout(() => this.showInstallBanner(), 1000);
        // Remove listeners after showing prompt
        engagementEvents.forEach((event) => {
          document.removeEventListener(event, trackEngagement);
        });
      }
    };

    engagementEvents.forEach((event) => {
      document.addEventListener(event, trackEngagement, { once: false, passive: true });
    });
  },

  /**
   * Handle app shortcuts from manifest.json
   */
  handleAppShortcuts() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'chat') {
      // Auto-start chat if launched from shortcut
      const startBtn = document.getElementById('start-btn');
      const tosCheck = document.getElementById('tos-check');

      if (startBtn && tosCheck) {
        // Auto-accept TOS for shortcut (user already installed app)
        tosCheck.checked = true;
        startBtn.disabled = false;

        // Slight delay for better UX
        setTimeout(() => {
          startBtn.click();
        }, 500);
      }
    }
  },

  /**
   * Setup service worker message listeners
   */
  setupServiceWorkerListeners() {
    if (!navigator.serviceWorker) {
      return;
    }

    // Use a named function to prevent duplicates (though addEventListener allows duplicates of same function ref, anonymous ones are always new)
    // To ensure meaningful cleanup, we should remove the old one if we were re-initializing,
    // but app.js usually runs once per page load.
    // However, to be safe and "proper":

    if (this._swMessageHandler) {
      navigator.serviceWorker.removeEventListener('message', this._swMessageHandler);
    }

    this._swMessageHandler = (event) => {
      try {
        const { type, _message, success } = event.data;

        switch (type) {
          case 'SW_UPDATE':
            this.showUpdateNotification(event.data);
            break;
          case 'OFFLINE':
            this.showOfflineIndicator();
            break;
          case 'ONLINE':
            this.hideOfflineIndicator();
            break;
          case 'SYNC_COMPLETE':
            if (success) {
              showToast('Messages synced successfully', 'success');
            } else {
              showToast('Failed to sync some messages', 'error');
            }
            break;
        }
      } catch (err) {
        logError('SW_MESSAGE_ERROR', err);
      }
    };

    navigator.serviceWorker.addEventListener('message', this._swMessageHandler);
  },

  /**
   * Setup update detection for new service worker versions
   */
  setupUpdateDetection() {
    if (!navigator.serviceWorker) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates periodically
        setInterval(
          () => {
            registration.update().catch((err) => logError('SW_UPDATE_CHECK_ERROR', err));
          },
          60 * 60 * 1000
        ); // Check every hour

        // Listen for new service worker waiting
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready
              this.showUpdateNotification({
                message: 'A new version of STRNGR is available!',
                newVersion: 'latest',
              });
            }
          });
        });
      })
      .catch((err) => {
        logError('SW_REGISTRATION_ERROR', err);
      });
  },

  /**
   * Show update notification banner
   */
  showUpdateNotification(data) {
    if (document.getElementById('update-banner')) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.className = 'update-banner glass-panel';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = `
      position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: white; padding: 16px 24px; border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      display: flex; gap: 16px; align-items: center; z-index: 2001;
      animation: slideDown 0.3s ease-out; max-width: 90vw;
    `;

    const text = document.createElement('span');
    text.textContent = data.message || 'New version available!';
    text.style.fontWeight = '600';

    const btn = document.createElement('button');
    btn.textContent = 'Update Now';
    btn.setAttribute('aria-label', 'Update to new version');
    btn.style.cssText = `
      background: white; color: var(--primary); border: none;
      padding: 8px 16px; border-radius: 8px; font-weight: 600;
      cursor: pointer; transition: transform 0.2s;
    `;
    btn.onmouseover = () => (btn.style.transform = 'scale(1.05)');
    btn.onmouseout = () => (btn.style.transform = 'scale(1)');

    const close = document.createElement('button');
    close.innerHTML = '&times;';
    close.setAttribute('aria-label', 'Dismiss update notification');
    close.style.cssText = `
      background: none; border: none; font-size: 1.5rem;
      cursor: pointer; color: white; padding: 0 4px;
    `;

    btn.onclick = () => {
      // Tell service worker to skip waiting and activate
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
      // Reload page to get new version
      window.location.reload();
    };

    close.onclick = () => banner.remove();

    banner.appendChild(text);
    banner.appendChild(btn);
    banner.appendChild(close);
    document.body.appendChild(banner);

    // Add animation keyframes if not already present
    if (!document.getElementById('update-banner-styles')) {
      const style = document.createElement('style');
      style.id = 'update-banner-styles';
      style.textContent = `
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  },

  /**
   * Setup offline indicator in UI
   */
  setupOfflineIndicator() {
    // Create offline indicator element
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    indicator.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6z" 
              fill="currentColor" opacity="0.3"/>
        <path d="M8 5v4M8 11h.01" stroke="currentColor" stroke-width="2" 
              stroke-linecap="round"/>
      </svg>
      <span>You're offline</span>
      <button onclick="window.location.reload()" style="margin-left:8px; padding:2px 8px; border-radius:4px; border:1px solid currentColor; background:none; color:inherit; font-size:0.8em; cursor:pointer;">Retry</button>
    `;
    indicator.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: var(--error, #ef4444); color: white;
      padding: 12px 20px; border-radius: 100px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none; gap: 8px; align-items: center; z-index: 1999;
      font-size: 0.9rem; font-weight: 600;
      animation: slideUp 0.3s ease-out;
    `;
    document.body.appendChild(indicator);

    // Listen to online/offline events
    window.addEventListener('offline', () => this.showOfflineIndicator());
    window.addEventListener('online', () => this.hideOfflineIndicator());

    // Connect status polling for robustness
    setInterval(async () => {
      if (!navigator.onLine) {
        this.showOfflineIndicator();
        return;
      }
      // Optional: Ping server to check real connectivity
      // const res = await fetch('/api/health').catch(() => null);
      // if (!res) this.showOfflineIndicator();
    }, 5000);

    // Check initial state
    if (!navigator.onLine) {
      this.showOfflineIndicator();
    }
  },

  showOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
    }
  },

  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  },

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      // Don't show immediately - wait for user engagement
      // The trackUserEngagement method will show it at the right time
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.installPromptShown = true;
      showToast('App installed successfully! 🎉', 'success');

      // Track installation
      localStorage.setItem('strngr_installed', 'true');
    });
  },

  showInstallBanner() {
    if (!this.deferredPrompt || document.getElementById('install-banner')) {
      return;
    }
    if (this.installPromptShown) {
      return;
    }
    if (localStorage.getItem('strngr_installed') === 'true') {
      return;
    }

    this.installPromptShown = true;

    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.className = 'install-banner glass-panel';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-labelledby', 'install-banner-text');
    banner.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: var(--bg-white); border: 2px solid var(--primary);
      padding: 16px 24px; border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      display: flex; gap: 16px; align-items: center; z-index: 2000;
      animation: slideUp 0.3s ease-out; max-width: 90vw;
    `;

    const icon = document.createElement('div');
    icon.innerHTML = '📱';
    icon.style.fontSize = '2rem';

    const textContainer = document.createElement('div');
    textContainer.style.flex = '1';

    const text = document.createElement('div');
    text.id = 'install-banner-text';
    text.textContent = 'Install STRNGR';
    text.style.fontWeight = '700';
    text.style.fontSize = '1.1rem';

    const subtext = document.createElement('div');
    subtext.textContent = 'Get the full app experience';
    subtext.style.fontSize = '0.85rem';
    subtext.style.color = 'var(--text-muted)';
    subtext.style.marginTop = '2px';

    textContainer.appendChild(text);
    textContainer.appendChild(subtext);

    const btn = document.createElement('button');
    btn.textContent = 'Install';
    btn.setAttribute('aria-label', 'Install STRNGR App');
    btn.style.cssText = `
      background: var(--primary); color: white; border: none;
      padding: 10px 20px; border-radius: 10px; font-weight: 600;
      cursor: pointer; transition: transform 0.2s;
    `;
    btn.onmouseover = () => (btn.style.transform = 'scale(1.05)');
    btn.onmouseout = () => (btn.style.transform = 'scale(1)');

    const close = document.createElement('button');
    close.innerHTML = '&times;';
    close.setAttribute('aria-label', 'Dismiss install banner');
    close.style.cssText = `
      background: none; border: none; font-size: 1.5rem;
      cursor: pointer; color: var(--text-muted); padding: 0 8px;
    `;

    btn.onclick = async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;

        if (outcome === 'accepted') {
          this.deferredPrompt = null;
          showToast('Installing...', 'info');
        } else {
          showToast('You can install later from your browser menu', 'info');
        }
      }
      banner.remove();
    };

    close.onclick = () => {
      banner.remove();
      // Don't show again this session
      sessionStorage.setItem('install_banner_dismissed', 'true');
    };

    banner.appendChild(icon);
    banner.appendChild(textContainer);
    banner.appendChild(btn);
    banner.appendChild(close);
    document.body.appendChild(banner);

    // Add animation styles
    if (!document.getElementById('install-banner-styles')) {
      const style = document.createElement('style');
      style.id = 'install-banner-styles';
      style.textContent = `
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  },

  /**
   * Request notification permission with user-friendly UI
   */
  async requestNotificationPermission() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast('Notifications not supported on this device', 'info');
      return false;
    }

    if (Notification.permission === 'granted') {
      await this.subscribeToPush();
      return true;
    }

    if (Notification.permission === 'denied') {
      showToast('Notifications blocked. Enable them in browser settings.', 'error');
      return false;
    }

    // Show custom prompt before browser prompt
    const userWantsNotifications = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'notification-prompt-modal';
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 3000; animation: fadeIn 0.2s;
      `;

      const content = document.createElement('div');
      content.className = 'glass-panel';
      content.style.cssText = `
        background: var(--bg-white); padding: 32px; border-radius: 20px;
        max-width: 400px; text-align: center; animation: scaleIn 0.3s;
      `;

      content.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 16px;">🔔</div>
        <h2 style="margin: 0 0 12px 0; font-size: 1.5rem;">Stay Connected</h2>
        <p style="color: var(--text-muted); margin: 0 0 24px 0;">
          Get notified when you receive new messages, even when the app is closed.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="notif-deny" style="
            padding: 12px 24px; border-radius: 10px; border: 2px solid var(--border);
            background: transparent; cursor: pointer; font-weight: 600;
          ">Not Now</button>
          <button id="notif-allow" style="
            padding: 12px 24px; border-radius: 10px; border: none;
            background: var(--primary); color: white; cursor: pointer; font-weight: 600;
          ">Enable Notifications</button>
        </div>
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      content.querySelector('#notif-allow').onclick = () => {
        modal.remove();
        resolve(true);
      };

      content.querySelector('#notif-deny').onclick = () => {
        modal.remove();
        resolve(false);
      };

      // Add animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `;
      document.head.appendChild(style);
    });

    if (!userWantsNotifications) {
      this.notificationPreferences.enabled = false;
      this.saveNotificationPreferences();
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.notificationPreferences.enabled = true;
      this.saveNotificationPreferences();
      await this.subscribeToPush();
      showToast('Notifications enabled! 🔔', 'success');
      return true;
    } else {
      this.notificationPreferences.enabled = false;
      this.saveNotificationPreferences();
      return false;
    }
  },

  /**
   * Toggle notification preferences
   */
  toggleNotifications(type) {
    if (!this.notificationPreferences.enabled) {
      this.requestNotificationPermission();
      return;
    }

    if (type) {
      this.notificationPreferences[type] = !this.notificationPreferences[type];
      this.saveNotificationPreferences();
      showToast(
        `${type} notifications ${this.notificationPreferences[type] ? 'enabled' : 'disabled'}`,
        'info'
      );
    }
  },

  async subscribeToPush() {
    const reg = await navigator.serviceWorker.ready;
    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        return;
      }

      const response = await fetch('/api/push/key');
      if (response.ok) {
        const { publicKey } = await response.json();
        const convertedKey = this.urlBase64ToUint8Array(publicKey);
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        window.dispatchEvent(new CustomEvent('push-subscribed', { detail: subscription }));
        showToast('Notifications enabled!', 'success');
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error('Push subscription failed', e);
      }
      showToast('Failed to enable notifications. Please try again.', 'error');
    }
  },

  setupTouchInteractions() {
    // Simple swipe detection for 'Next'
    let touchStartX = 0;
    let touchStartY = 0;
    const main = document.getElementById('chat-screen');

    main.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      },
      { passive: true }
    );

    main.addEventListener(
      'touchend',
      (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
      },
      { passive: true }
    );

    // Haptic on buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        window.vibrate(10);
      }
    });
  },

  handleSwipe(startX, startY, endX, endY) {
    // Detect Pull to refresh (Swipe Down) at top of list
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) {
      return;
    }

    const diffY = endY - startY;
    const diffX = endX - startX;

    // Pull to refresh (Swipe Down)
    if (diffY > 100 && Math.abs(diffX) < 50 && chatBox.scrollTop === 0) {
      // Trigger Next
      const nextBtn = document.getElementById('next-btn');
      if (nextBtn && !nextBtn.disabled && nextBtn.textContent === 'New Chat') {
        nextBtn.click();
        window.vibrate(20);
        showToast('Refreshing...', 'info');
      }
    }
  },

  setupBackgroundSync() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        // Safe check for sync support on the registration object
        if (reg.sync) {
          // Register background sync for failed messages
          window.registerBgSync = async () => {
            try {
              await reg.sync.register('sync-messages');
              log('Background sync registered');
            } catch (err) {
              // Fallback if register fails (e.g. some browsers with partial support)
              warn('Background sync registration failed:', err);
              this.fallbackSync();
            }
          };
        } else {
          // Sync not supported on registration
          this.fallbackSync();
        }

        // Register periodic sync if supported (for Chrome 80+)
        if ('periodicSync' in reg) {
          reg.periodicSync
            .register('sync-messages-periodic', {
              minInterval: 24 * 60 * 60 * 1000, // Once per day
            })
            .catch((err) => {
              log('Periodic sync not available:', err.message);
            });
        }
      });
    } else {
      this.fallbackSync();
    }
  },

  fallbackSync() {
    // Fallback: use visibility change to sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        // Trigger manual sync via custom event
        window.dispatchEvent(new CustomEvent('manual-sync'));
      }
    });
  },

  setupViewportFix() {
    const setRealVh = () => {
      const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setRealVh);
    window.addEventListener('orientationchange', setRealVh);
    setRealVh();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        setRealVh();
        if (
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.tagName === 'INPUT'
        ) {
          setTimeout(() => {
            const chatBox = document.getElementById('chat-box');
            if (chatBox) {
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          }, 100);
        }
      });
    }

    // Mobile Keyboard Handling
    const msgInput = document.getElementById('msg-input');
    if (msgInput) {
      msgInput.addEventListener('focus', () => {
        document.body.classList.add('keyboard-open');
        setTimeout(() => {
          const chatBox = document.getElementById('chat-box');
          if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
            // Force a slight scroll to ensure the input is visible on iOS
            window.scrollTo(0, 0);
          }
        }, 300);
      });
      msgInput.addEventListener('blur', () => {
        document.body.classList.remove('keyboard-open');
        setRealVh();
      });
    }
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },
};

// Onboarding Manager
const OnboardingManager = {
  init() {
    if (!localStorage.getItem('strngr_onboarding')) {
      // Delay slightly to allow initial load
      setTimeout(() => this.show(), 1000);
    }
  },

  show() {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.style.zIndex = '3000'; // Above everything
    modal.innerHTML = `
      <div class="settings-overlay"></div>
      <div class="settings-content glass-panel" style="max-width: 400px; text-align: center; padding-bottom: 32px;">
        <div class="settings-header" style="justify-content: center; border-bottom: none; padding-bottom: 0;">
          <div style="font-size: 3rem;">👋</div>
        </div>
        
        <div class="settings-body" style="overflow: visible;">
          <h2 style="margin-bottom: 12px; font-size: 1.5rem;">Welcome to STRNGR</h2>
          <p style="color: var(--text-muted); line-height: 1.6; margin-bottom: 32px;">
            A safe space for anonymous conversations. <br/>
            No profiles. No history. Just human connection.
          </p>
          
          <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; text-align: left; padding: 0 20px;">
             <div style="display: flex; gap: 16px; align-items: center;">
               <div style="background: var(--bg-light); padding: 10px; border-radius: 50%;">💬</div>
               <div>
                  <strong>Chat Instantly</strong>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">One-click matchup. No signups.</div>
               </div>
             </div>
             <div style="display: flex; gap: 16px; align-items: center;">
               <div style="background: var(--bg-light); padding: 10px; border-radius: 50%;">🎭</div>
               <div>
                  <strong>Stay Anonymous</strong>
                  <div style="font-size: 0.85rem; color: var(--text-muted);">Your identity is never shared.</div>
               </div>
             </div>
          </div>

          <button id="onboarding-start" class="primary-btn pulse" style="width: 100%;">
            Get Started
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const btn = modal.querySelector('#onboarding-start');
    btn.onclick = () => {
      modal.remove();
      localStorage.setItem('strngr_onboarding', 'true');
      showToast('Welcome aboard!', 'success');
      // Optional: Highlight the start button
      const startBtn = document.getElementById('start-btn');
      if (startBtn) {
        startBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        startBtn.focus();
      }
    };
  },
};

PWAManager.init();
window.PWAManager = PWAManager;

// Init Settings & Onboarding
SettingsManager.init(PWAManager, FeedbackManager);
OnboardingManager.init();
