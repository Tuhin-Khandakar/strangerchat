import { sanitize, transitionState, socketStates, getIpHash } from '../server.js';

describe('Server Utilities', () => {
  describe('sanitize()', () => {
    test('should trim whitespace', () => {
      expect(sanitize('  hello  ')).toBe('hello');
    });

    test('should escape HTML tags', () => {
      expect(sanitize('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert("xss")&lt;/script&gt;'
      );
    });

    test('should truncate long messages', () => {
      const longString = 'a'.repeat(1005);
      expect(sanitize(longString).length).toBe(1000);
    });

    test('should return empty string for non-string input', () => {
      expect(sanitize(null)).toBe('');
      expect(sanitize(undefined)).toBe('');
      expect(sanitize(123)).toBe('');
    });
  });

  describe('getIpHash()', () => {
    // Mock socket object
    const createMockSocket = (address, headers = {}) => ({
      handshake: {
        headers,
        address,
      },
      request: {
        connection: {
          remoteAddress: address,
        },
      },
    });

    test('should generate consistent hash for same IP', () => {
      const mockSocket = createMockSocket('127.0.0.1');
      const hash1 = getIpHash(mockSocket);
      const hash2 = getIpHash(mockSocket);
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
    });

    test('should prefer x-forwarded-for if present', () => {
      const forwardedSocket = createMockSocket('127.0.0.1', { 'x-forwarded-for': '10.0.0.1' });
      const directSocket = createMockSocket('10.0.0.1');
      const hash1 = getIpHash(forwardedSocket);
      const hash2 = getIpHash(directSocket);

      expect(hash1).toBe(hash2);
    });
  });

  describe('transitionState()', () => {
    beforeEach(() => {
      socketStates.clear();
    });

    test('should define valid transitions', () => {
      socketStates.set('socket1', { state: 'idle' });

      // idle -> waiting
      transitionState('socket1', 'waiting');
      expect(socketStates.get('socket1').state).toBe('waiting');

      // waiting -> chatting
      transitionState('socket1', 'chatting');
      expect(socketStates.get('socket1').state).toBe('chatting');

      // chatting -> idle
      transitionState('socket1', 'idle');
      expect(socketStates.get('socket1').state).toBe('idle');
    });

    test('should block invalid transitions', () => {
      socketStates.set('socket1', { state: 'idle' });

      // idle -> chatting (invalid directly)
      transitionState('socket1', 'chatting');
      expect(socketStates.get('socket1').state).toBe('idle');
    });

    test('should update metadata', () => {
      socketStates.set('socket1', { state: 'waiting', foo: 'bar' });
      transitionState('socket1', 'chatting', { roomId: 'room1' });

      const state = socketStates.get('socket1');
      expect(state.state).toBe('chatting');
      expect(state.roomId).toBe('room1');
      expect(state.foo).toBe('bar');
    });
  });
});
