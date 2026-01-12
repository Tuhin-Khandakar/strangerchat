import { io } from 'socket.io-client';
import { showToast, showConfirm, sanitizeInput, ICONS, announce, logError } from './utils.js';
import { SoundManager } from './sound.js';
import { solvePoW } from './pow.js';

let socket;
let isConnected = false;
let isBanned = false;
let actionLock = false;
let lastMessageTime = 0;
let reportsSent = 0;
let messageQueue = [];
let heartbeatInterval = null;
let lastHeartbeat = Date.now();

// DOM Elements (assigned in init)
let elements = {};
const MAX_MSG_LENGTH = 1000;
const HEARTBEAT_INTERVAL_MS = 10000;
const HEARTBEAT_TIMEOUT_MS = 25000;

/**
 * Initializes the chat module with necessary DOM elements and sets up listeners.
 * @param {Object} domElements - Collection of DOM elements used by the chat.
 */
export function initChat(domElements) {
  // Cleanup previous session if fully re-initializing
  if (window._chatCleanup) {
    window._chatCleanup();
  }

  elements = domElements;
  cleanupFns = []; // Reset cleanup functions list

  // Initialize Socket with exponential backoff and explicit fallback
  // Ensure previous socket is closed to prevent leaks
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
  }

  socket = io({
    reconnection: true,
    reconnectionAttempts: Infinity, // Keep trying
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    randomizationFactor: 0.5,
    transports: ['websocket', 'polling'], // Explicitly allow polling fallback
    upgrade: true,
  });

  setupSocketListeners();
  setupUIListeners();
  setupNetworkListeners();
  setupKeyboardShortcuts();
  startHeartbeat();

  // Connection timeout for initial load
  const connectionTimeout = setTimeout(() => {
    if (!socket.connected && !isBanned) {
      showPermanentFailureUI();
    }
  }, 15000);

  socket.once('connect', () => clearTimeout(connectionTimeout));

  // Session Restoration
  const savedState = sessionStorage.getItem('strngr_chat_state');
  if (savedState) {
    restoreChatState();
  } else {
    // Initial Find Match if no saved state
    // We defer this slightly to ensure connection listeners are ready
    if (!socket.connected) {
      socket.once('connect', () => {
        socket.emit('find_match');
      });
    } else {
      socket.emit('find_match');
    }
  }

  // Register global cleanup
  window._chatCleanup = () => {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('Cleanup error:', e);
        }
      }
    });
    cleanupFns = [];
    if (socket) {
      socket.disconnect();
      socket.removeAllListeners();
    }
    stopHeartbeat();
  };
}

let cleanupFns = [];

function setupSocketListeners() {
  if (!socket) {
    return;
  }
  socket.on('connect', () => {
    if (isBanned) {
      return;
    }
    hideConnectionOverlay();
  });

  socket.on('challenge', async (data) => {
    if (data && data.type === 'pow') {
      const { prefix, complexity } = data;
      try {
        const solution = await solvePoW(prefix, complexity);
        socket.emit('solve_challenge', solution);
      } catch (err) {
        // Development-only logging
        if (import.meta.env.DEV) {
          console.error('PoW generation failed:', err);
        }
        showToast('Verification failed. Please refresh.', 'error');
        announce('Verification failed.');
        socket.disconnect();
      }
    } else if (data && data.token) {
      try {
        const solution = data.token.split('').reverse().join('');
        socket.emit('solve_challenge', solution);
      } catch (err) {
        // Development-only logging
        if (import.meta.env.DEV) {
          console.error('Legacy Challenge Failed', err);
        }
        showToast('Verification error.', 'error');
      }
    }
  });

  socket.on('searching', () => {
    setChatState('searching');
    announce('Searching for a new stranger...');
  });

  socket.on('online_count', (count) => {
    const onlineCountEl = document.getElementById('online-count');
    if (onlineCountEl) {
      onlineCountEl.textContent = `Online: ${count}`;
    }
  });

  socket.on('matched', () => {
    setChatState('connected');
    if (window.vibrate) {
      window.vibrate(200);
    }
    SoundManager.play('match');
    announce('You are now connected with a stranger. Say hello!');
  });

  socket.on('receive_msg', (data) => {
    if (window.vibrate) {
      window.vibrate(50);
    }
    SoundManager.play('message');
    const sanitizedText = document.createTextNode(data.text);
    appendMessage(sanitizedText.textContent, 'stranger');
    announce(`New message: ${data.text}`);
  });

  socket.on('partner_left', () => {
    setChatState('disconnected');
    elements.typingUI.style.visibility = 'hidden';
    SoundManager.play('disconnect');
    appendSystemMessage('Stranger left the chat.');
    announce('Stranger has left the conversation.');
  });

  let partnerTypingTimeout;
  socket.on('partner_typing', (isTyping) => {
    if (typeof isTyping !== 'boolean') {
      return;
    }
    elements.typingUI.style.visibility = isTyping ? 'visible' : 'hidden';

    // Safety timeout to prevent stuck typing indicator
    if (partnerTypingTimeout) {
      clearTimeout(partnerTypingTimeout);
    }
    if (isTyping) {
      partnerTypingTimeout = setTimeout(() => {
        elements.typingUI.style.visibility = 'hidden';
      }, 5000); // Auto-hide after 5s if no update
    }
  });

  socket.on('sys_error', (msg) => {
    if (msg.toLowerCase().includes('ban')) {
      handleBan(msg);
    } else {
      showToast(msg, 'warning');
      announce(msg);
    }
  });

  socket.on('banned', (data) => {
    handleBan(data.reason || 'You have been banned.');
  });

  socket.on('connect_error', (err) => {
    if (isBanned) {
      return;
    }
    if (err.message && err.message.includes('banned')) {
      handleBan(err.message);
      return;
    }
    elements.chatStatus.textContent = 'Connection is quiet...';
    showToast('Connection hiccup. Reconnecting...', 'info');

    // Fallback: If reconnection fails permanently (reconnect_failed is triggered after reconnectionAttempts)
    // but since we have reconnectionAttempts: Infinity, we use a manual counter or check socket.io state
  });

  socket.on('reconnect_failed', () => {
    showPermanentFailureUI();
  });

  socket.on('disconnect', (reason) => {
    isConnected = false;
    elements.chatStatus.textContent = 'Waiting for someone...';
    TypingManager.reset();
    announce('Connection lost. Attempting to reconnect...');
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('reconnect', () => {
    showToast('We are back online.', 'success');
    announce('Connection restored.');
    hideConnectionOverlay();
    processMessageQueue();
    // If we were in a chat, let the server know we're back
    if (isConnected) {
      socket.emit('rejoin_chat');
    }
  });

  socket.on('pong', () => {
    lastHeartbeat = Date.now();
  });

  const visibilityHandler = () => {
    // Only reconnect if we're not banned, visible, and NOT currently connected or connecting
    if (document.visibilityState === 'visible' && !socket.connected && !isBanned) {
      // Avoid duplicate calls if already connecting (though socket.io handles this well, explicit check matches intent)
      showConnectionOverlay();
      socket.connect();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  cleanupFns.push(() => document.removeEventListener('visibilitychange', visibilityHandler));

  // Listen for manual sync events (fallback for browsers without background sync)
  const manualSyncHandler = () => {
    processMessageQueue();
  };
  window.addEventListener('manual-sync', manualSyncHandler);
  cleanupFns.push(() => window.removeEventListener('manual-sync', manualSyncHandler));
}

function setupNetworkListeners() {
  const onlineHandler = () => {
    showToast('Your connection is back.', 'success');
    announce('You are back online.');
    if (socket && !socket.connected && !isBanned) {
      socket.connect();
    }
    processMessageQueue();
  };

  const offlineHandler = () => {
    showToast('You are offline. Messages will be sent when back online.', 'info');
    announce('You have gone offline.');
    updateConnectionQuality(null);
  };

  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  cleanupFns.push(() => {
    window.removeEventListener('online', onlineHandler);
    window.removeEventListener('offline', offlineHandler);
  });
}

function setupKeyboardShortcuts() {
  const keyHandler = (e) => {
    // Esc to trigger Next button if chat is active
    if (e.key === 'Escape') {
      const chatScreen = document.getElementById('chat-screen');
      if (chatScreen && chatScreen.classList.contains('active')) {
        elements.nextBtn.click();
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleanupFns.push(() => document.removeEventListener('keydown', keyHandler));
}

function showConnectionOverlay() {
  let overlay = document.getElementById('connection-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'connection-overlay';
    overlay.className = 'connection-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-busy', 'true');
    overlay.innerHTML = `
      <div class="overlay-content">
        <span class="loading-spinner large"></span>
        <p>Reconnecting...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('active');
}

function hideConnectionOverlay() {
  const overlay = document.getElementById('connection-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

function showPermanentFailureUI() {
  const overlay = document.getElementById('connection-overlay') || showConnectionOverlay();
  overlay.innerHTML = `
    <div class="overlay-content">
      <div style="font-size: 3rem; margin-bottom: 1rem;">📡</div>
      <h2 style="color: var(--danger);">Connection Lost</h2>
      <p style="margin-bottom: 1.5rem;">We're having trouble reaching the servers. This might be a network issue or the service is down.</p>
      <button onclick="window.location.reload()" class="start-btn" style="padding: 0.8rem 1.5rem;">Reload Application</button>
    </div>
  `;
  overlay.classList.add('active');
  overlay.setAttribute('aria-busy', 'false');
}

function handleBan(msg) {
  isBanned = true;
  setChatState('banned');
  const bannedMessage = document.getElementById('banned-message');
  if (bannedMessage) {
    bannedMessage.style.display = 'block';
    bannedMessage.textContent = msg;
    announce(`Banned: ${msg}`, 'assertive');
  }
  socket.disconnect();
}

function setupUIListeners() {
  elements.nextBtn.addEventListener('click', () => {
    if (actionLock || !socket) {
      return;
    }
    if (!socket.connected) {
      showToast('Connecting you back...', 'info');
      socket.connect();
      return;
    }

    actionLock = true;
    const originalText = elements.nextBtn.textContent;
    elements.nextBtn.innerHTML = '<span class="loading-spinner"></span> ' + originalText;

    const releaseLock = () => {
      actionLock = false;
      elements.nextBtn.textContent = originalText;
    };

    const lockTimeout = setTimeout(releaseLock, 5000);

    socket.emit('leave_chat', () => {
      clearTimeout(lockTimeout);
      releaseLock();
    });

    resetChatUI();
    setChatState('searching');
    socket.emit('find_match');
  });

  elements.sendBtn.addEventListener('click', sendMessage);

  elements.msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  elements.msgInput.addEventListener('input', () => {
    const rawText = elements.msgInput.value;
    if (rawText.length > MAX_MSG_LENGTH) {
      elements.msgInput.value = rawText.substring(0, MAX_MSG_LENGTH);
      showToast(`Message limit reached (${MAX_MSG_LENGTH})`, 'info');
    }
    const text = elements.msgInput.value.trim();
    if (text.length > 0) {
      TypingManager.handleInput();
    } else {
      TypingManager.setTyping(false);
    }
  });

  elements.reportBtn.addEventListener('click', () => {
    if (!socket.connected || !isConnected || actionLock) {
      return;
    }
    if (reportsSent >= 1) {
      return;
    }

    showConfirm('Report Stranger?', 'Report this person for violating terms?', 'Report', () => {
      socket.emit('report_user');
      reportsSent++;
      showToast('Report submitted.', 'info');
      elements.nextBtn.click();
    });
  });

  const qualityInterval = setInterval(() => {
    if (!socket || !socket.connected) {
      updateConnectionQuality(null);
      return;
    }
    const start = Date.now();
    socket.emit('ping_latency', () => {
      updateConnectionQuality(Date.now() - start);
    });
  }, 5000);

  cleanupFns.push(() => clearInterval(qualityInterval));
  // Removed legacy window._chatCleanup override as it is now centrally managed via cleanupFns
}

function sendMessage() {
  const rawText = elements.msgInput.value;
  const text = sanitizeInput(rawText);

  if (!text || text.length === 0) {
    return;
  }
  if (text.length > MAX_MSG_LENGTH) {
    showToast(`Message too long (max ${MAX_MSG_LENGTH} characters)`);
    return;
  }

  const now = Date.now();
  if (now - lastMessageTime < 500) {
    showToast('Taking it slow...', 'info');
    return;
  }
  lastMessageTime = now;

  if (isConnected) {
    elements.msgInput.value = '';
    const msgWrapper = appendMessage(text, 'me', 'sending');
    const msgId = Date.now().toString();
    msgWrapper.dataset.id = msgId;

    if (!navigator.onLine || !socket.connected) {
      messageQueue.push({ text, msgWrapper });
      saveChatState();
      return;
    }

    performSendMessage(text, msgWrapper);
    TypingManager.setTyping(false);
  }
}

function performSendMessage(text, msgWrapper) {
  if (!socket) {
    return;
  }

  const MAX_ATTEMPTS = 3;
  let attempts = 0;
  let retryTimeout = null;
  // Unique ID for deduplication on server if supported, or tracking here
  // const msgId = msgWrapper.dataset.id;

  const trySend = () => {
    if (!socket.connected) {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      handleSendFailure(msgWrapper, text);
      return;
    }

    attempts++;

    // Explicit timeout for the ack
    const ackTimeoutMs = 5000;
    let ackReceived = false;

    socket.emit('send_msg', text, (ack) => {
      ackReceived = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }

      if (ack && ack.error) {
        logError('SEND_MSG_ERROR', ack.error);
        handleSendFailure(msgWrapper, text);
      } else {
        handleSendSuccess(msgWrapper);
      }
    });

    // Timeout fallback if server never acks
    retryTimeout = setTimeout(() => {
      if (ackReceived) {
        return;
      } // Race condition: Ack arrived just as timeout fired

      const statusDiv = msgWrapper.querySelector('.msg-status');
      // If element removed from DOM, stop
      if (!msgWrapper.parentNode) {
        return;
      }

      if (
        statusDiv &&
        (statusDiv.innerText.includes('Sending') || statusDiv.classList.contains('status-sending'))
      ) {
        if (attempts < MAX_ATTEMPTS && socket.connected) {
          // Backoff slightly
          setTimeout(trySend, 500);
        } else {
          handleSendFailure(msgWrapper, text);
        }
      }
    }, ackTimeoutMs);
  };

  trySend();
  saveChatState();
}

let isProcessingQueue = false;

function processMessageQueue() {
  if (messageQueue.length === 0) {
    return;
  }
  // Guard against offline or racing calls
  if (!navigator.onLine || !socket || !socket.connected) {
    return;
  }
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  // Process a copy to prevent race conditions
  const queueToProcess = [...messageQueue];
  messageQueue = [];

  try {
    queueToProcess.forEach(({ text, msgWrapper }) => {
      // Double check connection before each send attempt
      if (socket.connected) {
        try {
          performSendMessage(text, msgWrapper);
        } catch (err) {
          logError('QUEUE_PROCESSING_ERROR', err);
          // If immediate error, consider retrying or failing
          // We don't push back to messageQueue to avoid loop; let user retry manually via handleSendFailure if needed
          // But performSendMessage handles its own failure UI
        }
      } else {
        // If we lost connection mid-loop, push back?
        // Or let them fail to "Retry" button state.
        // "Retry" button state is safer (no duplicate auto-sends).
        handleSendFailure(msgWrapper, text);
      }
    });
  } finally {
    // Small delay before unlocking to ensure bursts sort themselves out
    setTimeout(() => {
      isProcessingQueue = false;
    }, 100);
  }
}

function handleSendSuccess(msgWrapper) {
  const statusDiv = msgWrapper.querySelector('.msg-status');
  if (statusDiv) {
    statusDiv.innerHTML = 'Sent ' + ICONS.check;
    statusDiv.className = 'msg-status status-sent';
  }
  saveChatState();
}

function handleSendFailure(msgWrapper, originalText) {
  const statusDiv = msgWrapper.querySelector('.msg-status');
  if (statusDiv) {
    statusDiv.innerHTML =
      'Failed <button class="retry-btn" aria-label="Retry sending message">Retry</button>';
    statusDiv.className = 'msg-status status-error';
    const retryBtn = statusDiv.querySelector('.retry-btn');
    retryBtn.onclick = () => {
      msgWrapper.remove();
      messageQueue = messageQueue.filter((item) => item.msgWrapper !== msgWrapper);
      elements.msgInput.value = originalText;
      sendMessage();
    };
  }

  // Store failed message for background sync
  storeFailedMessage(originalText);

  saveChatState();
}

/**
 * Store failed message for background sync
 */
async function storeFailedMessage(text) {
  try {
    // Store in service worker cache for background sync
    if ('caches' in window) {
      const cache = await caches.open('strngr-messages');
      const messageData = {
        text,
        timestamp: Date.now(),
        socketId: socket?.id,
      };

      const response = new Response(JSON.stringify(messageData), {
        headers: { 'Content-Type': 'application/json' },
      });

      await cache.put(new Request(`/failed-message-${Date.now()}`), response);
    }

    // Register background sync
    if (window.registerBgSync) {
      await window.registerBgSync();
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Failed to store message for sync:', err);
    }
  }
}

function saveChatState() {
  const messages = Array.from(elements.chatBox.querySelectorAll('.msg-wrapper')).map((mw) => ({
    text: mw.querySelector('.text').textContent,
    side: mw.classList.contains('me') ? 'me' : 'stranger',
    status: mw.querySelector('.status-sent')
      ? 'sent'
      : mw.querySelector('.status-error')
        ? 'failed'
        : 'sending',
  }));
  sessionStorage.setItem(
    'strngr_chat_state',
    JSON.stringify({
      messages,
      isConnected,
      isBanned,
    })
  );
}

function restoreChatState() {
  const saved = sessionStorage.getItem('strngr_chat_state');
  if (saved) {
    try {
      const {
        messages,
        isConnected: savedIsConnected,
        isBanned: savedIsBanned,
      } = JSON.parse(saved);
      elements.chatBox.innerHTML = '';

      if (messages && messages.length > 0) {
        messages.forEach((m) => appendMessage(m.text, m.side, m.status || 'sent'));
      }

      if (savedIsBanned) {
        handleBan('You have been banned.');
        return;
      }

      if (savedIsConnected) {
        setChatState('disconnected');
        appendSystemMessage('Connection lost due to page refresh.');
      } else {
        setChatState('searching');
        if (socket && socket.connected) {
          socket.emit('find_match');
        } else {
          socket.once('connect', () => socket.emit('find_match'));
        }
      }
    } catch (e) {
      logError('CHAT_STATE_RESTORE_ERROR', e);
      sessionStorage.removeItem('strngr_chat_state');
      socket.emit('find_match');
    }
  }
}

function appendMessage(text, side, status = 'sent') {
  const wrapper = document.createElement('div');
  wrapper.classList.add('msg-wrapper', side);
  wrapper.setAttribute('role', 'listitem');

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('msg', side);
  const textDiv = document.createElement('div');
  textDiv.classList.add('text');
  textDiv.textContent = text;
  msgDiv.appendChild(textDiv);
  wrapper.appendChild(msgDiv);

  if (side === 'me') {
    const statusDiv = document.createElement('div');
    statusDiv.className = `msg-status status-${status}`;
    statusDiv.innerHTML = getStatusIcon(status);
    if (status === 'sending') {
      statusDiv.innerHTML = 'Sending...';
    } else if (status === 'sent') {
      statusDiv.innerHTML = 'Sent ' + ICONS.check;
    }
    wrapper.appendChild(statusDiv);
  }

  elements.chatBox.appendChild(wrapper);
  elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
  return wrapper;
}

function getStatusIcon(status) {
  if (status === 'sending') {
    return ICONS.clock;
  }
  if (status === 'sent') {
    return ICONS.check;
  }
  return '';
}

function appendSystemMessage(text) {
  const sysDiv = document.createElement('div');
  sysDiv.classList.add('system-msg');
  sysDiv.setAttribute('role', 'status');
  sysDiv.textContent = text;
  elements.chatBox.appendChild(sysDiv);
  elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
}

function resetChatUI() {
  elements.chatBox.innerHTML = '';
  elements.msgInput.value = '';
  elements.typingUI.style.visibility = 'hidden';
  reportsSent = 0;
  TypingManager.reset();
}

function setChatState(state) {
  if (state === 'searching') {
    elements.chatStatus.textContent = 'Finding a human connection...';
    showSkeleton();

    if (window.searchTimer) {
      clearTimeout(window.searchTimer);
    }
    window.searchTimer = setTimeout(() => {
      if (!isConnected) {
        const text = 'Still searching for a stranger. Hang tight...';
        elements.chatStatus.textContent = text;
        announce(text);
      }
    }, 10000);

    elements.msgInput.disabled = true;
    elements.sendBtn.disabled = true;
    elements.nextBtn.textContent = 'Skip';
    elements.reportBtn.disabled = true;
    isConnected = false;
  } else if (state === 'connected') {
    if (window.searchTimer) {
      clearTimeout(window.searchTimer);
    }
    elements.chatBox.innerHTML = '';
    elements.chatStatus.textContent = 'Human connection established.';
    elements.msgInput.disabled = false;
    elements.sendBtn.disabled = false;
    elements.nextBtn.textContent = 'Next';
    elements.reportBtn.disabled = false;
    isConnected = true;
    appendSystemMessage("You're connected with a stranger.");
    // Focus the input for keyboard users
    setTimeout(() => elements.msgInput.focus(), 100);
  } else if (state === 'disconnected') {
    elements.chatStatus.textContent = 'The conversation has ended.';
    elements.msgInput.disabled = true;
    elements.sendBtn.disabled = true;
    elements.nextBtn.textContent = 'New Chat';
    elements.reportBtn.disabled = true;
    isConnected = false;
  } else if (state === 'banned') {
    elements.chatStatus.textContent = 'Restricted';
    isConnected = false;
    disableAll();
  }
}

function disableAll() {
  elements.msgInput.disabled = true;
  elements.sendBtn.disabled = true;
  elements.nextBtn.disabled = true;
  elements.reportBtn.disabled = true;
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.disabled = true;
  }
}

function showSkeleton() {
  elements.chatBox.innerHTML = `
        <div class="chat-skeleton" role="presentation" aria-hidden="true">
            <div class="skeleton skeleton-msg left"></div>
            <div class="skeleton skeleton-msg right"></div>
            <div class="skeleton skeleton-msg left" style="width: 40%"></div>
        </div>
    `;
}

function updateConnectionQuality(latency) {
  const el = document.getElementById('connection-quality');
  if (!el) {
    return;
  }
  el.className = 'connection-quality';

  if (latency === null || !navigator.onLine) {
    el.classList.add('conn-offline');
    el.setAttribute('aria-label', 'Connection offline');
  } else if (latency < 100) {
    el.classList.add('conn-good');
    el.setAttribute('aria-label', 'Excellent connection');
  } else if (latency < 300) {
    el.classList.add('conn-fair');
    el.setAttribute('aria-label', 'Fair connection');
  } else if (latency < 700) {
    el.classList.add('conn-poor');
    el.setAttribute('aria-label', 'Poor connection');
  } else {
    el.classList.add('conn-very-poor');
    el.setAttribute('aria-label', 'Very poor connection');
  }
}

function startHeartbeat() {
  stopHeartbeat();
  // Ensure we don't start multiple intervals if something goes wrong
  if (heartbeatInterval) {
    return;
  }

  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('heartbeat');
      if (Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        // If timeout, force reconnect
        socket.disconnect().connect();
        lastHeartbeat = Date.now();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

const TypingManager = {
  state: 'idle',
  lastEmit: 0,
  typingTimeout: null,
  debounceTimeout: null,
  cooldownTimeout: null,
  DEBOUNCE_MS: 300,
  INACTIVITY_MS: 2000,
  COOLDOWN_MS: 1000,

  handleInput() {
    if (!socket.connected || !isConnected || this.state === 'cooldown') {
      return;
    }

    if (this.state === 'idle') {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(() => {
        this.setTyping(true);
      }, this.DEBOUNCE_MS);
    } else {
      this.resetInactivityTimer();
    }
  },
  setTyping(isTyping) {
    if (isTyping) {
      if (this.state === 'typing') {
        return;
      }
      this.state = 'typing';
      this.emit(true);
      this.resetInactivityTimer();
    } else {
      if (this.state !== 'typing') {
        return;
      }
      this.state = 'cooldown';
      this.emit(false);
      this.clearTimers();
      this.cooldownTimeout = setTimeout(() => {
        this.state = 'idle';
      }, this.COOLDOWN_MS);
    }
  },
  emit(isTyping) {
    if (socket && socket.connected) {
      socket.emit('typing', isTyping);
      this.lastEmit = Date.now();
    }
  },
  resetInactivityTimer() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.typingTimeout = setTimeout(() => this.setTyping(false), this.INACTIVITY_MS);
  },
  clearTimers() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    if (this.cooldownTimeout) {
      clearTimeout(this.cooldownTimeout);
    }
  },
  reset() {
    this.clearTimers();
    // Force emit false if we think we are typing, just in case
    // But check connection logic - if disconnected, we can't emit.
    // If we are just resetting state for NEW chat, we shoud try to emit if connected.
    if (this.state === 'typing' && socket && socket.connected) {
      this.emit(false);
    }
    this.state = 'idle';
  },
};

window.addEventListener('push-subscribed', (e) => {
  if (socket && socket.connected) {
    socket.emit('push_subscription', e.detail);
  }
});
