/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

describe('Client App', () => {
  let appModule;
  let mockSocket;

  beforeAll(async () => {
    // 1. Setup global mocks
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      connected: false,
      disconnect: jest.fn(),
    };
    global.io = jest.fn(() => mockSocket);

    // 2. Setup DOM before module load (critical because app.js queries DOM at top level)
    document.body.innerHTML = `
            <div id="landing-screen" class="active"></div>
            <div id="chat-screen"></div>
            <div id="chat-box"></div>
            <textarea id="msg-input"></textarea>
            <button id="send-btn"></button>
            <button id="next-btn"></button>
            <button id="start-btn"></button>
            <input type="checkbox" id="tos-check" />
            <div id="chat-status"></div>
            <div id="typing-ui" style="visibility: hidden"></div>
            <button id="theme-toggle"></button>
            <button id="theme-toggle-chat"></button>
            <button id="report-btn"></button>
            <div id="banned-message" style="display: none"></div>
            <div id="online-count"></div>
            <div id="connection-quality"></div>
            <div class="toast-container"></div>
        `;

    // Mock matchMedia (JSDOM doesn't support it)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // 3. Dynamic import - Let it fail if it fails so we see the error
    appModule = await import('../app.js');
  });

  test('sanitizeInput removes control characters', () => {
    const { sanitizeInput } = appModule;
    const bad = 'Hello\u200BWorld';
    expect(sanitizeInput(bad)).toBe('HelloWorld');
  });

  test('getStatusIcon returns correct icon', () => {
    const { getStatusIcon } = appModule;
    expect(getStatusIcon('sending')).toContain('svg');
  });

  test('appendMessage updates DOM', () => {
    const { appendMessage } = appModule;
    document.getElementById('chat-box').innerHTML = ''; // Clear previous

    appendMessage('Hello test', 'me', 'sent');
    const chatBox = document.getElementById('chat-box');
    expect(chatBox.children.length).toBe(1);
    expect(chatBox.textContent).toContain('Hello test');
  });

  test('TypingManager emits event', () => {
    const { TypingManager } = appModule;
    TypingManager.reset();
    mockSocket.emit.mockClear();
    global.io().connected = true;

    TypingManager.setTyping(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('typing', true);
  });

  test('setChatState updates UI', () => {
    const { setChatState } = appModule;
    setChatState('searching');
    expect(document.getElementById('chat-status').textContent).toContain('Looking');
    expect(document.getElementById('send-btn')).toBeDisabled();

    setChatState('connected');
    expect(document.getElementById('chat-status').textContent).toContain('connected');
    expect(document.getElementById('send-btn')).not.toBeDisabled();
  });

  test('toggleTheme switches theme', () => {
    const { toggleTheme } = appModule;
    document.documentElement.setAttribute('data-theme', 'light');
    toggleTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
