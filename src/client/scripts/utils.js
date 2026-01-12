/**
 * SVG icons used throughout the application.
 * @type {Object.<string, string>}
 */
export const ICONS = {
  check:
    '<svg class="icon-check" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  clock:
    '<svg class="icon-check" aria-hidden="true" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
  error:
    '<svg class="icon-check" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
};

/**
 * Announces a message to screen readers using the hidden announcer region.
 * @param {string} message - The message to announce.
 * @param {'polite'|'assertive'} [priority='polite'] - The priority of the announcement.
 */
export function announce(message, priority = 'polite') {
  const announcer = document.getElementById('announcer');
  if (announcer) {
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }
}

/**
 * Displays a temporary toast notification message.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'|'warning'} [type='success'] - The type of toast.
 */
export function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  if (type === 'error') {
    toast.setAttribute('role', 'alert');
  }

  let icon = '';
  if (type === 'success') {
    icon = '✅';
  }
  if (type === 'error') {
    icon = '⚠️';
  }
  if (type === 'info') {
    icon = 'ℹ️';
  }
  if (type === 'warning') {
    icon = '🔔';
  }

  toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

  container.appendChild(toast);
  announce(message, type === 'error' ? 'assertive' : 'polite');

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Displays a confirmation modal with robust focus management.
 * @param {string} title - Modal title.
 * @param {string} message - Modal body message.
 * @param {string} confirmText - Text for the confirm button.
 * @param {Function} onConfirm - Callback function executed when clicked 'Confirm'.
 */
export function showConfirm(title, message, confirmText, onConfirm) {
  const previousActiveElement = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
            <h3 id="modal-title">${title}</h3>
            <p id="modal-desc">${message}</p>
            <div class="modal-actions">
                <button class="modal-btn cancel" aria-label="Cancel and close">Cancel</button>
                <button class="modal-btn confirm" aria-label="${confirmText}">${confirmText}</button>
            </div>
        </div>
    `;

  document.body.appendChild(overlay);

  const cancelBtn = overlay.querySelector('.cancel');
  const confirmBtn = overlay.querySelector('.confirm');
  const focusableElements = overlay.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const cleanup = () => {
    overlay.classList.add('fade-out');
    // document.removeEventListener('keydown', handleTab); // Removed as we use overlay listener now for tabs
    document.removeEventListener('focus', handleFocus, true);
    setTimeout(() => {
      overlay.remove();
      if (previousActiveElement) {
        previousActiveElement.focus();
      }
    }, 200);
  };

  /**
   * Trap focus within the modal.
   */
  const handleTab = (e) => {
    const isTab = e.key === 'Tab';
    if (!isTab) {
      return;
    }

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  const handleFocus = (e) => {
    if (!overlay.contains(e.target)) {
      e.stopPropagation();
      firstFocusable.focus();
    }
  };

  cancelBtn.onclick = cleanup;
  confirmBtn.onclick = () => {
    onConfirm();
    cleanup();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      cleanup();
    }
  };

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cleanup();
    }
    handleTab(e);
  });

  // Prevent focus from leaving the modal
  document.addEventListener('focus', handleFocus, true);

  // Initial focus
  setTimeout(() => confirmBtn.focus(), 50);
}

/**
 * Sanitizes input text to prevent XSS and remove control characters.
 * @param {string} text - The raw input text.
 * @returns {string} The sanitized HTML-escaped string.
 */
export function sanitizeInput(text) {
  if (!text) {
    return '';
  }
  // Remove zero-width characters and control codes, but allow newlines/tabs

  const clean = text.replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F]/g,
    ''
  );

  // HTML Escape for XSS prevention
  return clean
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Checks browser support for critical features.
 * @returns {Object} Support flags
 */
/**
 * Logs an error to the server for telemetry.
 * @param {string} type - The type of error (e.g., 'API_ERROR', 'SOCKET_ERROR').
 * @param {Error|string} error - The error object or message.
 */
export function logError(type, error) {
  const errorData = {
    type,
    message: error?.message || error,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  if (import.meta.env.DEV) {
    console.group(`%c[${type}] Error Detected`, 'color: #ff4444; font-weight: bold;');
    console.error('Message:', errorData.message);
    console.error('Stack:', errorData.stack);
    console.groupEnd();
  }

  // Send to error tracking service
  const payload = JSON.stringify(errorData);

  const sendViaFetch = () => {
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* Failed to log error */
    });
  };

  try {
    if (navigator.sendBeacon) {
      // sendBeacon returns false if it failed to queue the request
      if (!navigator.sendBeacon('/api/logs/error', payload)) {
        sendViaFetch();
      }
    } else {
      sendViaFetch();
    }
  } catch (e) {
    // Fallback if sendBeacon throws an error (e.g. payload too large)
    sendViaFetch();
  }
}

export function checkBrowserSupport() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    webSocket: 'WebSocket' in window,
    localStorage: 'localStorage' in window,
    sessionStorage: 'sessionStorage' in window,
  };
}
