import { io } from 'socket.io-client';
import crypto from 'crypto';

const URL = process.env.URL || 'http://localhost:3000';
const CLIENT_COUNT = parseInt(process.env.CLIENTS || '100', 10);
const INTERVAL_MS = 2000;

console.log(`Starting load test with ${CLIENT_COUNT} clients against ${URL}`);

const clients = [];
let connectedCount = 0;
let messageCount = 0;
let errorCount = 0;

function solveChallenge(prefix, complexity) {
  let nonce = 0;
  const target = '0'.repeat(complexity);
  while (true) {
    const str = nonce.toString();
    const hash = crypto
      .createHash('sha256')
      .update(prefix + str)
      .digest('hex');
    if (hash.endsWith(target)) {
      return str;
    }
    nonce++;
  }
}

function createClient(id) {
  // Spoof IP to bypass rate limits (10 connections/min per IP)
  const fakeIp = `10.0.${Math.floor(id / 255)}.${id % 255}`;

  const socket = io(URL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000,
    extraHeaders: {
      'x-forwarded-for': fakeIp,
    },
  });

  socket.on('connect', () => {
    connectedCount++;
    if (connectedCount % 10 === 0) {
      console.log(`Connected: ${connectedCount}/${CLIENT_COUNT}`);
    }
    // Wait for challenge
  });

  socket.on('challenge', (data) => {
    if (data.type === 'pow') {
      const solution = solveChallenge(data.prefix, data.complexity);
      socket.emit('solve_challenge', solution);
    }
  });

  socket.on('challenge_success', () => {
    // Start lifecycle after verification
    setTimeout(() => {
      socket.emit('find_match');
    }, Math.random() * 2000);
  });

  socket.on('matched', () => {
    // Send a message occasionally
    setInterval(
      () => {
        if (socket.connected) {
          socket.emit('send_msg', `Message from client ${id}`);
          messageCount++;
        }
      },
      INTERVAL_MS + Math.random() * 1000
    );
  });

  socket.on('disconnect', (_reason) => {
    connectedCount--;
  });

  socket.on('connect_error', (_err) => {
    errorCount++;
    if (errorCount % 10 === 0) {
      console.error(`Connection Errors: ${errorCount}`);
    }
  });

  return socket;
}

// Ramp up clients
let added = 0;
const payloadInterval = setInterval(() => {
  if (added >= CLIENT_COUNT) {
    clearInterval(payloadInterval);
    console.log('All clients initialized.');
    return;
  }
  clients.push(createClient(added++));
}, 50); // Add 20 clients per second

// Log stats
setInterval(() => {
  console.log(
    `Stats: ${connectedCount} connected, ${messageCount} msgs sent, ${errorCount} errors`
  );
}, 5000);

// Stop after some time
setTimeout(() => {
  console.log('Stopping load test...');
  clients.forEach((s) => s.close());
  process.exit(0);
}, 60000); // Run for 60 seconds
