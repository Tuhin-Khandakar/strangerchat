import { SoundManager } from './sound.js';
import { showToast } from './utils.js';

export const SettingsManager = {
  modal: null,
  pwaManager: null, // to be injected
  feedbackManager: null, // to be injected
  activeTab: 'general',

  init(pwaManager, feedbackManager) {
    this.pwaManager = pwaManager;
    this.feedbackManager = feedbackManager;
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettings());
    }

    // Initialize Preferences
    this.applyPreferences();
  },

  applyPreferences() {
    // Theme
    const savedTheme = localStorage.getItem('theme') || 'system';
    if (savedTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Font Size
    const fontSize = localStorage.getItem('strngr_font_size') || '100';
    document.documentElement.style.fontSize = `${fontSize}%`;
  },

  showSettings() {
    if (this.modal) {
      this.modal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.className = 'settings-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');

    this.modal.innerHTML = `
      <div class="settings-overlay"></div>
      <div class="settings-content glass-panel">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="settings-close" aria-label="Close">&times;</button>
        </div>
        
        <div class="settings-tabs" role="tablist" aria-label="Settings sections">
          <button class="tab-btn ${this.activeTab === 'general' ? 'active' : ''}" data-tab="general" role="tab" aria-selected="${this.activeTab === 'general'}" aria-controls="settings-body">General</button>
          <button class="tab-btn ${this.activeTab === 'appearance' ? 'active' : ''}" data-tab="appearance" role="tab" aria-selected="${this.activeTab === 'appearance'}" aria-controls="settings-body">Appearance</button>
          <button class="tab-btn ${this.activeTab === 'notifications' ? 'active' : ''}" data-tab="notifications" role="tab" aria-selected="${this.activeTab === 'notifications'}" aria-controls="settings-body">Notifications</button>
          <button class="tab-btn ${this.activeTab === 'about' ? 'active' : ''}" data-tab="about" role="tab" aria-selected="${this.activeTab === 'about'}" aria-controls="settings-body">About</button>
        </div>

        <div class="settings-body" id="settings-body">
          ${this.renderTab(this.activeTab)}
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachListeners();

    // Focus loop trap
    const focusable = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) {
      focusable[0].focus();
    }

    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      } else if (e.key === 'Escape') {
        this.hideSettings();
      }
    });

    // Store last focused element to restore later
    this.lastFocused = document.activeElement;
  },

  renderTab(tab) {
    switch (tab) {
      case 'general':
        return this.renderGeneral();
      case 'appearance':
        return this.renderAppearance();
      case 'notifications':
        return this.renderNotifications();
      case 'about':
        return this.renderAbout();
      default:
        return this.renderGeneral();
    }
  },

  renderGeneral() {
    const dndEnabled = localStorage.getItem('strngr_dnd') === 'true';
    const lang = localStorage.getItem('strngr_lang') || 'en';

    return `
      <div class="settings-section">
        <h3>Preferences</h3>
        <div class="settings-toggle">
          <label>
            <input type="checkbox" id="dnd-toggle" ${dndEnabled ? 'checked' : ''}>
            <span>Do Not Disturb</span>
          </label>
          <p class="settings-description">Auto-decline new matches and mute notifications</p>
        </div>

        <div class="settings-control">
          <label for="lang-select">Language</label>
          <select id="lang-select" class="select-input">
            <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${lang === 'es' ? 'selected' : ''}>Español (Preview)</option>
            <option value="fr" ${lang === 'fr' ? 'selected' : ''}>Français (Preview)</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>Data</h3>
        <button class="settings-action-btn" id="export-chat-btn">
          📥 Export Chat History
        </button>
        <button class="settings-action-btn" id="clear-cache-btn">
          🗑️ Clear Cache & Reset
        </button>
      </div>
    `;
  },

  renderAppearance() {
    const currentTheme = localStorage.getItem('theme') || 'system';
    const currentSize = localStorage.getItem('strngr_font_size') || '100';

    return `
      <div class="settings-section">
        <h3>Theme</h3>
        <div class="theme-grid">
          ${this._renderThemeOption('system', 'Auto', currentTheme)}
          ${this._renderThemeOption('light', 'Light', currentTheme)}
          ${this._renderThemeOption('dark', 'Dark', currentTheme)}
          ${this._renderThemeOption('midnight', 'Midnight', currentTheme)}
          ${this._renderThemeOption('forest', 'Forest', currentTheme)}
          ${this._renderThemeOption('sunset', 'Sunset', currentTheme)}
        </div>
      </div>

      <div class="settings-section">
        <h3>Font Size</h3>
        <div class="range-wrapper">
          <span class="range-label">Aa</span>
          <input type="range" id="font-size-range" min="80" max="130" step="5" value="${currentSize}">
          <span class="range-label" style="font-size: 1.2em">Aa</span>
        </div>
        <div style="text-align: center; font-size: 0.9em; color: var(--text-muted); margin-top: 8px;">
          ${currentSize}%
        </div>
      </div>
    `;
  },

  _renderThemeOption(id, label, current) {
    const active = current === id ? 'active' : '';
    return `
      <button class="theme-option ${active}" data-theme-id="${id}" aria-pressed="${current === id}">
        <div class="theme-preview theme-${id}"></div>
        <span>${label}</span>
      </button>
    `;
  },

  renderNotifications() {
    const prefs = this.pwaManager.notificationPreferences || {};
    const notifStatus = Notification?.permission || 'default';
    const soundMuted = SoundManager.muted;

    return `
       <div class="settings-section">
        <h3>Sound Effects</h3>
        <div class="settings-toggle">
          <label>
            <input type="checkbox" id="sound-toggle" ${!soundMuted ? 'checked' : ''}>
            <span>Enable Sounds</span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3>Push Notifications</h3>
        ${notifStatus === 'denied' ? '<div class="settings-notice error">⚠️ Notifications are blocked in browser settings.</div>' : ''}
        
        <div class="settings-toggle">
          <label>
            <input type="checkbox" id="notif-enabled" ${prefs.enabled ? 'checked' : ''} ${notifStatus === 'denied' ? 'disabled' : ''}>
            <span>Enable Push Notifications</span>
          </label>
        </div>
        
        ${
          prefs.enabled
            ? `
          <div class="settings-toggle-group">
            <div class="settings-toggle">
              <label><input type="checkbox" id="notif-messages" ${prefs.messages ? 'checked' : ''}><span>Messages</span></label>
            </div>
            <div class="settings-toggle">
              <label><input type="checkbox" id="notif-matches" ${prefs.matches ? 'checked' : ''}><span>Matches</span></label>
            </div>
          </div>
        `
            : ''
        }
      </div>
    `;
  },

  renderAbout() {
    const isInstalled = localStorage.getItem('strngr_installed') === 'true';
    return `
      <div class="settings-section centered">
        <h3>STRNGR</h3>
        <p class="version">Version 2.1.0</p>
        <p class="settings-description">An anonymous chat experiment.</p>
        
        <div class="settings-actions">
           ${
             !isInstalled && this.pwaManager.deferredPrompt
               ? `
             <button class="settings-action-btn primary" id="install-app-btn">📱 Install App</button>
           `
               : ''
           }
           <button class="settings-action-btn" id="check-update-btn">🔄 Check for Updates</button>
           <button class="settings-action-btn" id="report-bug-btn" style="color: var(--danger); border-color: var(--danger);">🐞 Report Bug</button>
        </div>
        
        <div style="margin-top: 24px; font-size: 0.8em; color: var(--text-muted);">
          <a href="privacy.html" target="_blank">Privacy</a> • <a href="terms.html" target="_blank">Terms</a>
        </div>
      </div>
    `;
  },

  attachListeners() {
    const modal = this.modal;

    // Tabs
    modal.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.onclick = () => {
        this.activeTab = btn.dataset.tab;
        this.showSettings(); // Re-render logic is simpler than partial updates for now
      };
    });

    // Close
    modal.querySelector('.settings-close').onclick = () => this.hideSettings();
    modal.querySelector('.settings-overlay').onclick = () => this.hideSettings();

    // General: DND
    const dnd = modal.querySelector('#dnd-toggle');
    if (dnd) {
      dnd.onchange = (e) => localStorage.setItem('strngr_dnd', e.target.checked);
    }

    // General: Lang
    const lang = modal.querySelector('#lang-select');
    if (lang) {
      lang.onchange = (e) => {
        localStorage.setItem('strngr_lang', e.target.value);
        showToast('Language preference saved (Partial Support)', 'info');
      };
    }

    // General: Export
    const exportBtn = modal.querySelector('#export-chat-btn');
    if (exportBtn) {
      exportBtn.onclick = () => this.exportChat();
    }

    // General: Clear Cache
    const clearBtn = modal.querySelector('#clear-cache-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (confirm('Reset all settings and cache?')) {
          localStorage.clear();
          sessionStorage.clear();
          if ('caches' in window) {
            caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
          }
          window.location.reload();
        }
      };
    }

    // Appearance: Themes
    modal.querySelectorAll('.theme-option').forEach((btn) => {
      btn.onclick = () => {
        const theme = btn.dataset.themeId;
        localStorage.setItem('theme', theme);
        this.applyPreferences();
        this.showSettings();
      };
    });

    // Appearance: Font
    const fontRange = modal.querySelector('#font-size-range');
    if (fontRange) {
      fontRange.oninput = (e) => {
        let value = parseInt(e.target.value, 10);
        // Basic clamp for live preview
        if (value < 80) {
          value = 80;
        }
        if (value > 130) {
          value = 130;
        }

        document.documentElement.style.fontSize = `${value}%`;
      };
      fontRange.onchange = (e) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value) || value < 80) {
          value = 80;
        }
        if (value > 130) {
          value = 130;
        }

        // Update input visually if it was out of bounds
        e.target.value = value;
        localStorage.setItem('strngr_font_size', value);
        this.showSettings();
      };
    }

    // Notifications: Sound
    const soundToggle = modal.querySelector('#sound-toggle');
    if (soundToggle) {
      soundToggle.onchange = (e) => SoundManager.setMuted(!e.target.checked);
    }

    // Notifications: Push (Reuse logic from pwaManager if possible or verify)
    const notifEnabled = modal.querySelector('#notif-enabled');
    if (notifEnabled) {
      notifEnabled.onchange = async (e) => {
        if (e.target.checked) {
          const success = await this.pwaManager.requestNotificationPermission();
          if (!success) {
            e.target.checked = false;
          } else {
            this.showSettings();
          }
        } else {
          this.pwaManager.notificationPreferences.enabled = false;
          this.pwaManager.saveNotificationPreferences();
          this.showSettings();
        }
      };
    }

    ['messages', 'matches'].forEach((key) => {
      const el = modal.querySelector(`#notif-${key}`);
      if (el) {
        el.onchange = (e) => {
          this.pwaManager.notificationPreferences[key] = e.target.checked;
          this.pwaManager.saveNotificationPreferences();
        };
      }
    });

    // About Actions
    const installBtn = modal.querySelector('#install-app-btn');
    if (installBtn) {
      installBtn.onclick = () => {
        this.pwaManager.promptInstall();
        this.hideSettings();
      };
    }

    const updateBtn = modal.querySelector('#check-update-btn');
    if (updateBtn) {
      updateBtn.onclick = async () => {
        if (navigator.serviceWorker) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
          }
          showToast('Checking for updates...', 'info');
        }
      };
    }

    const reportBtn = modal.querySelector('#report-bug-btn');
    if (reportBtn) {
      reportBtn.onclick = () => {
        this.hideSettings();
        this.feedbackManager.show();
      };
    }
  },

  hideSettings() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
      if (this.lastFocused) {
        this.lastFocused.focus();
        this.lastFocused = null;
      }
    }
  },

  exportChat() {
    const messages = document.querySelectorAll('.msg-wrapper');
    if (messages.length === 0) {
      showToast('No messages to export.', 'info');
      return;
    }

    let text = 'STRNGR Chat Export\n' + new Date().toLocaleString() + '\n\n';
    messages.forEach((wrapper) => {
      const who = wrapper.classList.contains('me') ? 'You' : 'Stranger';
      const content = wrapper.querySelector('.text').textContent;
      const _time = new Date().toLocaleTimeString(); // logic for real time missing in DOM, using export time for now or just sequence
      text += `[${who}]: ${content}\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strngr-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Chat exported!', 'success');
  },
};
