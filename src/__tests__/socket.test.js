process.env.DB_NAME = ':memory:';

import { server, io, socketStates } from '../server.js';
import Client from 'socket.io-client';

const PORT = 3001;

describe('Socket.IO Integration', () => {
  let clientSocket1, clientSocket2;

  beforeAll((done) => {
    server.listen(PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  beforeEach(() => {
    socketStates.clear();
  });

  const setupChallengeHandler = (socket) => {
    socket.on('challenge', (data) => {
      const solution = data.token.split('').reverse().join('');
      socket.emit('solve_challenge', solution);
    });
  };

  afterEach(() => {
    if (clientSocket1 && clientSocket1.connected) {
      clientSocket1.disconnect();
    }
    if (clientSocket2 && clientSocket2.connected) {
      clientSocket2.disconnect();
    }
  });

  test('should allow a client to connect', (done) => {
    clientSocket1 = new Client(`http://localhost:${PORT}`);
    setupChallengeHandler(clientSocket1);
    clientSocket1.on('connect', () => {
      expect(clientSocket1.connected).toBe(true);
      done();
    });
  });

  test('matchmaking should pair two users', (done) => {
    clientSocket1 = new Client(`http://localhost:${PORT}`);
    clientSocket2 = new Client(`http://localhost:${PORT}`);
    setupChallengeHandler(clientSocket1);
    setupChallengeHandler(clientSocket2);

    let matchCount = 0;
    const checkMatch = () => {
      matchCount++;
      if (matchCount === 2) {
        done();
      }
    };

    clientSocket1.on('connect', () => {
      // Small delay to ensure challenge is solved before emit
      setTimeout(() => clientSocket1.emit('find_match'), 100);
    });

    clientSocket2.on('connect', () => {
      setTimeout(() => clientSocket2.emit('find_match'), 100);
    });

    clientSocket1.on('matched', (data) => {
      expect(data).toBeDefined();
      checkMatch();
    });

    clientSocket2.on('matched', (data) => {
      expect(data).toBeDefined();
      checkMatch();
    });
  }, 10000);

  test('users should be able to exchange messages', (done) => {
    clientSocket1 = new Client(`http://localhost:${PORT}`);
    clientSocket2 = new Client(`http://localhost:${PORT}`);
    setupChallengeHandler(clientSocket1);
    setupChallengeHandler(clientSocket2);

    const message = 'Hello Stranger';

    clientSocket1.on('connect', () => {
      setTimeout(() => clientSocket1.emit('find_match'), 100);
    });
    clientSocket2.on('connect', () => {
      setTimeout(() => clientSocket2.emit('find_match'), 100);
    });

    let matched = 0;
    const onMatched = () => {
      matched++;
      if (matched === 2) {
        setTimeout(() => {
          clientSocket1.emit('send_msg', message);
        }, 100);
      }
    };

    clientSocket1.on('matched', onMatched);
    clientSocket2.on('matched', onMatched);

    clientSocket2.on('receive_msg', (data) => {
      expect(data.text).toBe(message);
      done();
    });
  }, 10000);

  test('typing indicator should work', (done) => {
    clientSocket1 = new Client(`http://localhost:${PORT}`);
    clientSocket2 = new Client(`http://localhost:${PORT}`);
    setupChallengeHandler(clientSocket1);
    setupChallengeHandler(clientSocket2);

    clientSocket1.on('connect', () => {
      setTimeout(() => clientSocket1.emit('find_match'), 100);
    });
    clientSocket2.on('connect', () => {
      setTimeout(() => clientSocket2.emit('find_match'), 100);
    });

    let matched = 0;
    const onMatched = () => {
      matched++;
      if (matched === 2) {
        setTimeout(() => {
          clientSocket1.emit('typing', true);
        }, 50);
      }
    };

    clientSocket1.on('matched', onMatched);
    clientSocket2.on('matched', onMatched);

    clientSocket2.on('partner_typing', (isTyping) => {
      if (isTyping) {
        expect(isTyping).toBe(true);
        done();
      }
    });
  }, 10000);
});
