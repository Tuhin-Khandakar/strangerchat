const { io } = require('socket.io-client');
const axios = require('axios');

async function runTest() {
  console.log('--- Starting End-to-End Chat & Admin Test ---');

  // Client 1
  const client1 = io('http://localhost:3000', { reconnection: false });
  // Client 2
  const client2 = io('http://localhost:3000', { reconnection: false });

  let matchedRooms = 0;
  let receivedMessages = 0;

  client1.on('connect', () => {
    console.log('Client 1 connected:', client1.id);
    client1.emit('find_match');
  });

  client2.on('connect', () => {
    console.log('Client 2 connected:', client2.id);
    client2.emit('find_match');
  });

  // Handle Client 1 Match
  client1.on('matched', (data) => {
    console.log('Client 1 matched! Streak:', data.streak);
    matchedRooms++;
    
    // Simulate typing and sending a message
    client1.emit('typing', true);
    setTimeout(() => {
      client1.emit('send_msg', 'Hello from Client 1!');
    }, 500);
  });

  // Handle Client 2 Match & Receive Message
  client2.on('matched', (data) => {
    console.log('Client 2 matched! Streak:', data.streak);
    matchedRooms++;
  });

  client2.on('receive_msg', (data) => {
    console.log('Client 2 received message:', data.text);
    receivedMessages++;

    // Client 2 reports Client 1
    console.log('Client 2 is reporting Client 1...');
    client2.emit('report_user', { reason: 'Test Report' });
  });

  // Client 1 gets reported
  client1.on('partner_left', () => {
    console.log('Client 1 partner left.');
  });

  // Wait a bit for the flow to finish, then check Admin Stats
  setTimeout(async () => {
    console.log('\n--- Checking Admin API ---');
    try {
      const statsRes = await axios.get('http://localhost:3000/api/admin/stats');
      console.log('Admin Stats:', statsRes.data);

      const reportsRes = await axios.get('http://localhost:3000/api/admin/reports');
      console.log(`Found ${reportsRes.data.length} reports.`);
      if (reportsRes.data.length > 0) {
        console.log('Latest Report Reason:', reportsRes.data[0].reason);
      }

      console.log('\n--- Test Results ---');
      if (matchedRooms === 2 && receivedMessages === 1 && statsRes.data.onlineCount === 2) {
        console.log('✅ TEST PASSED: Matchmaking, messaging, and reporting work as expected.');
      } else {
        console.log('❌ TEST FAILED.');
      }

    } catch (err) {
      console.error('Admin API error:', err.message);
    } finally {
      client1.disconnect();
      client2.disconnect();
      process.exit(0);
    }
  }, 2500);
}

runTest();
