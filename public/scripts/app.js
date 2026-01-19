const socket = io();

// DOM Elements
const landingScreen = document.getElementById('landing-screen');
const chatScreen = document.getElementById('chat-screen');
const chatBox = document.getElementById('chat-box');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const nextBtn = document.getElementById('next-btn');
const startBtn = document.getElementById('start-btn');
const tosCheck = document.getElementById('tos-check');
const chatStatus = document.getElementById('chat-status');
const typingUI = document.getElementById('typing-ui');
const reportBtn = document.getElementById('report-btn');
const bannedMessage = document.getElementById('banned-message');
const onlineCount = document.getElementById('online-count');

// State Variables
let isConnected = false;
let isBanned = false;
let typingTimeout;
let reportsSent = 0;
let actionLock = false;

// Socket Connection Events
socket.on('connect', () => {
    if (isBanned) return;
    chatBox.innerHTML = ''; // Clear "Connecting to server..."
});

// Event Listeners
tosCheck.addEventListener('change', () => {
    startBtn.disabled = !tosCheck.checked || isBanned;
});
function appendMessage(text, side) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', side);

    // Simple sanitization
    const sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    msgDiv.innerHTML = `
        <div class="sender-label">${side === 'me' ? 'You' : 'Stranger'}</div>
        <div class="text">${sanitizedText}</div>
    `;

    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendSystemMessage(text) {
    const sysDiv = document.createElement('div');
    sysDiv.classList.add('system-msg');
    sysDiv.textContent = text;
    chatBox.appendChild(sysDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function resetChatUI() {
    chatBox.innerHTML = '';
    msgInput.value = '';
    typingUI.style.visibility = 'hidden';
    reportsSent = 0;
    clearTimeout(typingTimeout);
}

function setChatState(state) {
    if (state === 'searching') {
        chatStatus.textContent = "Searching...";
        msgInput.disabled = true;
        sendBtn.disabled = true;
        nextBtn.textContent = "Skip";
        reportBtn.disabled = true;
        isConnected = false;
    } else if (state === 'connected') {
        chatStatus.textContent = "Connected to a stranger";
        msgInput.disabled = false;
        sendBtn.disabled = false;
        nextBtn.textContent = "Next";
        reportBtn.disabled = false;
        isConnected = true;
        appendSystemMessage("You're now chatting with a random stranger. Say hi!");
    } else if (state === 'disconnected') {
        chatStatus.textContent = "Stranger disconnected";
        msgInput.disabled = true;
        sendBtn.disabled = true;
        nextBtn.textContent = "New Chat";
        reportBtn.disabled = true;
        isConnected = false;
    } else if (state === 'banned') {
        chatStatus.textContent = "Banned";
        msgInput.disabled = true;
        sendBtn.disabled = true;
        nextBtn.disabled = true;
        reportBtn.disabled = true;
        startBtn.disabled = true;
        bannedMessage.style.display = 'block';
        isConnected = false;
    }
}

// Main Controls
startBtn.addEventListener('click', () => {
    landingScreen.classList.remove('active');
    chatScreen.classList.add('active');
    resetChatUI();
    socket.emit('find_match');
});

nextBtn.addEventListener('click', () => {
    if (actionLock) return;

    actionLock = true;
    setTimeout(() => { actionLock = false; }, 1000);

    socket.emit('leave_chat');
    resetChatUI();
    appendSystemMessage("Looking for someone new...");
    socket.emit('find_match');
});

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

msgInput.addEventListener('input', () => {
    socket.emit('typing', true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('typing', false);
    }, 2000);
});

reportBtn.addEventListener('click', () => {
    if (!isConnected || actionLock) return;

    if (reportsSent >= 1) {
        alert("You have already reported this user.");
        return;
    }

    if (confirm("Report this person for inappropriate behavior?")) {
        actionLock = true;
        setTimeout(() => { actionLock = false; }, 1000);

        socket.emit('report_user');
        reportsSent++;
        alert("Thank you. We will review this session.");
        nextBtn.click();
    }
});

function sendMessage() {
    const text = msgInput.value.trim();
    if (text && isConnected) {
        appendMessage(text, 'me');
        socket.emit('send_msg', text);
        msgInput.value = '';
        socket.emit('typing', false);
    }
}

// Socket Events
socket.on('searching', () => {
    setChatState('searching');
});

socket.on('online_count', (count) => {
    if (onlineCount) onlineCount.textContent = `Online: ${count}`;
});

socket.on('matched', () => {
    setChatState('connected');
});

socket.on('receive_msg', (data) => {
    appendMessage(data.text, 'stranger');
});

socket.on('partner_left', () => {
    setChatState('disconnected');
    appendSystemMessage("Stranger has disconnected.");
});

socket.on('partner_typing', (isTyping) => {
    typingUI.style.visibility = isTyping ? 'visible' : 'hidden';
});

socket.on('sys_error', (msg) => {
    appendSystemMessage("Error: " + msg);
    if (msg.toLowerCase().includes('ban')) {
        isBanned = true;
        setChatState('banned');
        socket.disconnect();
    }
});

socket.on("banned", (data) => {
    const msg = document.getElementById("banned-message");
    const btn = document.getElementById("start-btn");

    isBanned = true;
    msg.style.display = "block";
    msg.textContent = data.reason || "You have been banned.";
    btn.disabled = true;
    setChatState('banned');
    socket.disconnect();
});

socket.on('connect_error', () => {
    if (!isBanned) {
        appendSystemMessage("Connection lost. Retrying...");
    }
});
