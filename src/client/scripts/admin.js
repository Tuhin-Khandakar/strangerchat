import { logError, sanitizeInput } from './utils.js';
let socket;
let currentBansPage = 1;
let currentViolationsPage = 1;
let bansSearch = '';
let violationsSearch = '';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  // Fallback to meta tag if cookie not found (common pattern)
  const meta = document.querySelector(`meta[name="${name}"]`);
  if (meta) {
    return meta.content;
  }
  return null;
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Loading States
 */
function showSkeleton(tableId) {
  const tbody = document.getElementById(tableId);
  const template = document.getElementById('skeleton-row');
  tbody.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    tbody.appendChild(template.content.cloneNode(true));
  }
}

function updateConnectionStatus(status, color) {
  const el = document.getElementById('connection-status');
  if (el) {
    el.textContent = status;
    el.style.borderColor = color || 'var(--border)';
    el.style.color = color || 'var(--text-muted)';
  }
}

/**
 * Socket.IO Setup
 */
async function setupSocket() {
  const password = document.getElementById('auth-token').value || localStorage.getItem('admin_pwd');
  if (!password) {
    return;
  }

  if (socket) {
    socket.disconnect();
  }

  try {
    const { io } = await import('socket.io-client');
    socket = io();

    socket.on('connect', () => {
      socket.emit('admin_auth', password);
      updateConnectionStatus('Connected • Real-time', 'var(--success)');
    });

    socket.on('disconnect', (reason) => {
      updateConnectionStatus('Disconnected', 'var(--danger)');
      if (reason === 'io server disconnect') {
        // Server disconnected us manually, likely auth failure
        socket.disconnect();
      }
    });

    socket.on('connect_error', (err) => {
      updateConnectionStatus('Connection Error', 'var(--danger)');
      showToast('Socket connection failed: ' + err.message, 'error');
    });

    socket.on('admin_auth_success', () => {
      localStorage.setItem('admin_pwd', password);
      showToast('System authenticated & synchronized');
    });

    socket.on('admin_update', (data) => {
      showToast(`Update: ${data.type} detected`, 'success');
      loadData();
    });

    socket.on('admin_auth_failed', () => {
      showToast('Socket session failed', 'error');
      updateConnectionStatus('Auth Failed', 'var(--danger)');
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Socket load error:', err);
    }
  }
}

async function authenticate(e) {
  if (e) {
    e.preventDefault();
  }
  const passwordInput = document.getElementById('auth-token');
  const password = passwordInput.value;
  const btn = e?.target ? e.target.querySelector('button') : null;

  if (password) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Authenticating...';
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCookie('csrf_token'),
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        document.getElementById('auth-overlay').style.display = 'none';
        localStorage.setItem('admin_pwd', password);
        setupSocket();
        loadData();
      } else {
        const errData = await res.json().catch(() => ({ error: 'Invalid password' }));
        showToast(errData.error || 'Invalid administrative password', 'error');

        // Prevent immediate retry loop
        sessionStorage.setItem('auth_failed_recently', 'true');

        // Clear invalid password to prevent auto-auth loop on reload
        localStorage.removeItem('admin_pwd');

        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (err) {
      showToast('System communication error', 'error');
      logError('ADMIN_LOGIN_ERROR', err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Connect System';
      }
    }
  }
}

async function api(endpoint, method = 'GET', body = null, retries = 3, backoff = 1000) {
  const headers = {
    'Content-Type': 'application/json',
    'x-csrf-token': getCookie('csrf_token') || '',
  };

  for (let i = 0; i < retries; i++) {
    try {
      const url = endpoint.startsWith('/') ? endpoint : `/admin/api/${endpoint}`;
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });

      if (res.status === 403) {
        showToast('Session expired or access denied', 'error');
        localStorage.removeItem('admin_pwd');
        location.reload();
        return null;
      }

      const data = await res.json().catch(() => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return null;
      });

      if (!res.ok) {
        // Don't retry client errors (4xx) except maybe 429
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          showToast(data?.error || 'Request failed', 'error');
          return null;
        }
        throw new Error(data?.error || `Server error: ${res.status}`);
      }
      return data;
    } catch (err) {
      const isLastRetry = i === retries - 1;
      if (isLastRetry) {
        showToast('Network synchronization error', 'error');
        logError('ADMIN_API_ERROR', err);
        return null;
      }
      // Wait for backoff before next attempt
      await new Promise((resolve) => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
  }
}

function switchTab(tab, event) {
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.section').forEach((s) => {
    s.classList.remove('active');
    s.hidden = true;
  });

  if (event && event.target) {
    event.target.classList.add('active');
    event.target.setAttribute('aria-selected', 'true');
  } else {
    const targetTab = Array.from(document.querySelectorAll('.tab')).find((t) =>
      t.textContent.toLowerCase().includes(tab)
    );
    if (targetTab) {
      targetTab.classList.add('active');
      targetTab.setAttribute('aria-selected', 'true');
    }
  }

  const sec = document.getElementById(`sec-${tab}`);
  sec.classList.add('active');
  sec.hidden = false;

  // Reset pagination when switching tabs to prevent stale states
  if (tab === 'bans') {
    currentBansPage = 1;
  }
  if (tab === 'violations') {
    currentViolationsPage = 1;
  }

  loadData();
}

function loadData() {
  const activeTabEl = document.querySelector('.tab.active');
  if (!activeTabEl) {
    return;
  }
  const activeTab = activeTabEl.textContent.toLowerCase();

  if (activeTab.includes('words')) {
    loadWords();
  }
  if (activeTab.includes('violations')) {
    loadViolations();
  }
  if (activeTab.includes('bans')) {
    loadBans();
  }
  if (activeTab.includes('kill') || activeTab.includes('emergency')) {
    checkMaintenanceStatus();
  }
}

/**
 * Kill Switch / Maintenance Mode Functions
 */
async function checkMaintenanceStatus() {
  try {
    const data = await api('/api/maintenance/status');
    if (!data) {
      return;
    }

    const statusBadge = document.getElementById('status-badge');
    const statusDetails = document.getElementById('status-details');
    const enableBtn = document.getElementById('btn-enable-maintenance');
    const disableBtn = document.getElementById('btn-disable-maintenance');

    if (data.maintenance) {
      statusBadge.textContent = '🔴 MAINTENANCE MODE ACTIVE';
      statusBadge.style.background = 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)';
      statusBadge.style.color = 'white';
      statusBadge.style.fontWeight = '600';

      statusDetails.innerHTML = `
        <p style="color: var(--danger); font-weight: 600; margin-bottom: 0.5rem;">
          ⚠️ Service is currently in maintenance mode
        </p>
        <p style="margin: 0;">
          <strong>Reason:</strong> ${data.reason}<br>
          <strong>Activated:</strong> ${new Date(data.timestamp).toLocaleString()}
        </p>
      `;

      enableBtn.disabled = true;
      enableBtn.style.opacity = '0.5';
      disableBtn.disabled = false;
      disableBtn.style.opacity = '1';
    } else {
      statusBadge.textContent = '✅ Service Operational';
      statusBadge.style.background = 'linear-gradient(135deg, #00c853 0%, #00a843 100%)';
      statusBadge.style.color = 'white';
      statusBadge.style.fontWeight = '600';

      statusDetails.innerHTML = `
        <p style="color: var(--success); font-weight: 600; margin: 0;">
          ✓ All systems operational. Matchmaking is enabled.
        </p>
      `;

      enableBtn.disabled = false;
      enableBtn.style.opacity = '1';
      disableBtn.disabled = true;
      disableBtn.style.opacity = '0.5';
    }
  } catch (err) {
    logError('MAINTENANCE_STATUS_CHECK', err);
    showToast('Failed to check maintenance status', 'error');
  }
}

async function enableMaintenance() {
  const reasonInput = document.getElementById('maintenance-reason');
  const reason = reasonInput.value.trim();
  const enableBtn = document.getElementById('btn-enable-maintenance');

  if (reason.length < 5) {
    showToast('Please provide a valid reason (min 5 characters)', 'error');
    reasonInput.focus();
    return;
  }

  if (
    !confirm(
      '⚠️ WARNING: This will immediately disconnect ALL active users and prevent new connections.\n\nAre you absolutely sure?'
    )
  ) {
    return;
  }

  if (enableBtn) {
    enableBtn.disabled = true;
    enableBtn.textContent = 'Enabling...';
  }

  try {
    const data = await api('/api/admin/maintenance', 'POST', {
      enabled: true,
      reason: reason,
    });

    if (data) {
      showToast('Maintenance mode enabled.', 'success');
      reasonInput.value = ''; // Clear input
      checkMaintenanceStatus();
    }
  } catch (err) {
    logError('ENABLE_MAINTENANCE', err);
    showToast('Failed to enable maintenance mode', 'error');
  } finally {
    if (enableBtn) {
      enableBtn.disabled = false;
      enableBtn.textContent = 'Enable Maintenance';
    }
  }
}

async function disableMaintenance() {
  if (!confirm('Restore service and allow users to connect?')) {
    return;
  }

  const disableBtn = document.getElementById('btn-disable-maintenance');
  if (disableBtn) {
    disableBtn.disabled = true;
    disableBtn.textContent = 'Restoring...';
  }

  try {
    const data = await api('/api/admin/maintenance', 'POST', { enabled: false });

    if (data) {
      showToast('Service restored successfully', 'success');
      checkMaintenanceStatus();
    }
  } catch (err) {
    logError('DISABLE_MAINTENANCE', err);
    showToast('Failed to disable maintenance mode', 'error');
  } finally {
    // checkMaintenanceStatus will update the buttons, but just in case:
    if (disableBtn) {
      disableBtn.disabled = false;
      disableBtn.textContent = 'Disable Maintenance Mode';
    }
  }
}

async function loadWords() {
  showSkeleton('words-table');
  const response = await api('banned-words');
  const words = Array.isArray(response) ? response : response.data || [];
  const tbody = document.getElementById('words-table');

  if (words.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding: 3rem; color: var(--text-muted)">No banned words configured</td></tr>';
    return;
  }

  tbody.innerHTML = words
    .map(
      (w) => `
            <tr>
                <td data-label="Word"><strong>${sanitizeInput(w.word)}</strong></td>
                <td data-label="Severity"><span class="badge sev-${w.severity}">${w.severity === 3 ? 'Instant Ban' : w.severity === 2 ? 'Violation' : 'Block Only'
        }</span></td>
                <td data-label="Status">${w.enabled ? '<span style="color:var(--success)">● Active</span>' : '<span style="color:var(--text-muted)">○ Disabled</span>'}</td>
                <td data-label="Actions">
                    <button class="${w.enabled ? 'btn-danger' : 'btn-primary'}" style="padding: 0.5rem 1rem; font-size: 0.85rem" onclick="window.toggleWordState(${w.id}, ${!w.enabled})">
                        ${w.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button class="btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem; margin-left: 0.5rem" onclick="window.deleteWord(${w.id})">Delete</button>
                </td>
            </tr>
        `
    )
    .join('');
}

async function addWord() {
  const wordInput = document.getElementById('new-word');
  const severityInput = document.getElementById('new-severity');
  const btn = document.querySelector('#sec-words button.btn-primary'); // Assuming the add button is nearby or I should just use e.target if passed
  const word = sanitizeInput(wordInput.value);
  const severity = severityInput.value;

  if (!word) {
    showToast('Word cannot be empty', 'error');
    return;
  }

  // Find the button (hacky but works if structure is known, else ignore button state)
  const addBtn = wordInput.parentElement.querySelector('button');
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';
  }

  try {
    const res = await api('banned-words', 'POST', { word, severity: parseInt(severity) });
    if (res) {
      showToast(`"${word}" added to blacklist`);
      wordInput.value = '';
      loadWords();
    }
  } finally {
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.textContent = 'Add Word';
    }
  }
}

async function toggleWordState(id, enabled) {
  const res = await api(`banned-words/${id}`, 'PUT', { enabled });
  if (res) {
    showToast(`Word ${enabled ? 'enabled' : 'disabled'}`);
    loadWords();
  }
}

async function deleteWord(id) {
  if (confirm('Permanently remove this word from the blacklist?')) {
    const res = await api(`banned-words/${id}`, 'DELETE');
    if (res) {
      showToast('Word deleted');
      loadWords();
    }
  }
}

async function loadViolations() {
  showSkeleton('violations-table');
  const query = `?page=${currentViolationsPage}&search=${encodeURIComponent(violationsSearch)}`;
  const response = await api(`violations${query}`);
  if (!response) {
    return;
  }

  const { data, total, page, limit } = response;
  const tbody = document.getElementById('violations-table');

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding: 3rem; color: var(--text-muted)">No violations recorded</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map((v) => {
      const safeHash = sanitizeInput(v.ip_hash);
      return `
            <tr>
                <td data-label="IP Hash">
                    <code>${safeHash.substring(0, 12)}...</code>
                    <button class="copy-ip" title="Copy Full Hash" data-hash="${safeHash}" onclick="window.copyToClipboard(this.dataset.hash)">📋</button>
                </td>
                <td data-label="Count"><strong>${v.count}</strong></td>
                <td data-label="Last Seen">${new Date(v.last_seen).toLocaleTimeString()}</td>
                <td data-label="Actions">
                    <button class="btn-danger" style="padding: 0.5rem 1rem; font-size: 0.85rem" data-hash="${safeHash}" onclick="window.banUserPrompt(this.dataset.hash)">Ban User</button>
                </td>
            </tr>
        `;
    })
    .join('');

  renderPagination('violations-pagination', total, page, limit, (p) => {
    currentViolationsPage = p;
    loadViolations();
  });
}

async function loadBans() {
  showSkeleton('bans-table');
  const query = `?page=${currentBansPage}&search=${encodeURIComponent(bansSearch)}`;
  const response = await api(`bans${query}`);
  if (!response) {
    return;
  }

  const { data, total, page, limit } = response;
  const tbody = document.getElementById('bans-table');

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding: 3rem; color: var(--text-muted)">No active bans found</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map((b) => {
      const safeHash = sanitizeInput(b.ip_hash);
      return `
            <tr>
                <td data-label="IP Hash"><code>${safeHash.substring(0, 12)}...</code></td>
                <td data-label="Reports">${b.reports}</td>
                <td data-label="Banned Until">${new Date(b.banned_until).toLocaleString()}</td>
                <td data-label="Actions">
                    <button class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem" data-hash="${safeHash}" onclick="window.liftBan(this.dataset.hash)">Lift Ban</button>
                </td>
            </tr>
        `;
    })
    .join('');

  renderPagination('bans-pagination', total, page, limit, (p) => {
    currentBansPage = p;
    loadBans();
  });
}

function renderPagination(containerId, total, page, limit, onPageChange) {
  const totalPages = Math.ceil(total / limit);
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `<button ${page === 1 ? 'disabled' : ''} onclick="window.setPage('${containerId}', ${page - 1})">← Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="window.setPage('${containerId}', ${i})">${i}</button>`;
    } else if (i === page - 3 || i === page + 3) {
      html += '<span style="padding: 0.5rem">...</span>';
    }
  }

  html += `<button ${page === totalPages ? 'disabled' : ''} onclick="window.setPage('${containerId}', ${page + 1})">Next →</button>`;
  container.innerHTML = html;

  window[`cb_${containerId.replace('-', '_')}`] = onPageChange;
}

window.setPage = (containerId, p) => {
  const cb = window[`cb_${containerId.replace('-', '_')}`];
  if (cb) {
    cb(p);
  }
};

async function liftBan(ipHash) {
  if (confirm('Restore access for this IP hash?')) {
    const res = await api(`bans/${ipHash}`, 'DELETE');
    if (res) {
      showToast('Ban lifted successfully');
      loadBans();
    }
  }
}

async function banUserPrompt(ipHash) {
  const duration = prompt('Enter ban duration (days):', '1');
  if (duration === null) {
    return;
  }
  const reason = prompt('Enter reason for ban:', 'Manual administrative action');
  if (reason === null) {
    return;
  }

  const res = await api('bans', 'POST', {
    ipHash,
    duration: parseInt(duration) || 1,
    reason: reason || 'Manual ban',
  });

  if (res) {
    showToast('User has been banned');
    loadData();
  }
}

function handleViolationSearch(e) {
  violationsSearch = e.target.value;
  currentViolationsPage = 1;
  loadViolations();
}

function handleBanSearch(e) {
  bansSearch = e.target.value;
  currentBansPage = 1;
  loadBans();
}

function exportViolations() {
  window.location.href = '/admin/api/violations/export';
}

function exportBans() {
  window.location.href = '/admin/api/bans/export';
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('IP Hash copied to clipboard');
  });
}

// Expose functions to window
window.authenticate = authenticate;
window.switchTab = switchTab;
window.addWord = addWord;
window.toggleWordState = toggleWordState;
window.deleteWord = deleteWord;
window.liftBan = liftBan;
window.banUserPrompt = banUserPrompt;
window.handleViolationSearch = handleViolationSearch;
window.handleBanSearch = handleBanSearch;
window.exportViolations = exportViolations;
window.exportBans = exportBans;
window.copyToClipboard = copyToClipboard;
window.enableMaintenance = enableMaintenance;
window.disableMaintenance = disableMaintenance;
window.checkMaintenanceStatus = checkMaintenanceStatus;

// Initial check
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', authenticate);
  }

  const pwd = localStorage.getItem('admin_pwd');
  if (pwd) {
    document.getElementById('auth-token').value = pwd;
    // Auto-auth if password exists, but handle failure gracefully to avoid loop
    if (!sessionStorage.getItem('auth_failed_recently')) {
      authenticate().catch((err) => {
        if (import.meta.env.DEV) {
          console.error('Auto-auth failed:', err);
        }
        // Optionally clear password if persistent failure
      });
    }
  }
  // Remove unconditional loadData() - it should only run after auth success
});
