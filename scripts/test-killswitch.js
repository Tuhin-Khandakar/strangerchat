import { io } from 'socket.io-client';
import crypto from 'crypto';

const createSocket = (name) => {
  const socket = io('http://localhost:3000', {
    transports: ['websocket'],
    forceNew: true,
  });

  socket.on('connect', () => {
    console.log(`${name}: Connected - ID: ${socket.id}`);
  });

  socket.on('challenge', async (data) => {
    console.log(`${name}: Solving PoW complexity ${data.complexity}...`);
    const { prefix, complexity } = data;
    const target = '0'.repeat(complexity);
    let solution = 0;
    while (true) {
      const hash = crypto
        .createHash('sha256')
        .update(prefix + solution)
        .digest('hex');
      if (hash.endsWith(target)) {
        break;
      }
      solution++;
    }
    socket.emit('solve_challenge', solution.toString());
  });

  socket.on('sys_error', (msg) => {
    console.log(`${name} SYSTEM ERROR:`, msg);
  });

  return socket;
};

const s1 = createSocket('User 1');

s1.on('challenge_success', () => {
  console.log('User 1: PoW success. Finding match...');
  s1.emit('find_match', {});
});

s1.on('searching', () => {
  console.log('User 1: Searching... Delaying 2s then starting User 2');
  setTimeout(() => {
    const s2 = createSocket('User 2');

    s2.on('challenge_success', () => {
      console.log('User 2: PoW success. Finding match...');
      s2.emit('find_match', {});
    });

    s2.on('matched', () => {
      console.log('User 2: Matched!');
    });

    s2.on('banned', (data) => {
      console.log('User 2: BANNED (Same IP):', data);
    });

    s2.on('sys_error', (msg) => {
      console.log('User 2 SYSTEM ERROR:', msg);
    });
  }, 2000);
});

s1.on('matched', () => {
  console.log('User 1: Matched! Sending toxic message in 1s...');
  setTimeout(() => {
    s1.emit('send_msg', 'I will kill you spamlink.com');
  }, 1000);
});

s1.on('banned', (data) => {
  console.log('✓ SUCCESS: User 1 BANNED:', data);
  setTimeout(() => process.exit(0), 1000);
});

setTimeout(() => {
  console.log('Test timed out');
  process.exit(1);
}, 40000);
