#!/usr/bin/env node

/**
 * Manual E2E Testing Script for Critical User Journeys
 *
 * This script helps manually test critical flows by providing
 * a structured testing checklist and automated verification where possible.
 */

import { createInterface } from 'readline';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const testCases = [
  {
    id: 1,
    name: 'Matchmaking Flow',
    description: 'User clicks "Start Chatting" and gets matched with another user',
    steps: [
      'Open the application in two different browser windows/tabs',
      'Click "Start Chatting" in both windows',
      'Verify both users see "Searching for a stranger..." message',
      'Verify both users get matched and see "You\'re connected with a stranger" message',
      'Verify the chat interface becomes active (input enabled, send button enabled)',
    ],
    expectedResults: [
      'Both users should be matched within a few seconds',
      'Chat status should update from "Searching" to "Connected"',
      'Message input should be enabled',
      'Online count should be visible',
    ],
  },
  {
    id: 2,
    name: 'Message Sending and Receiving',
    description: 'Verify message sending and receiving works correctly',
    steps: [
      "With two matched users, type a message in User 1's chat",
      'Click Send or press Enter',
      'Verify User 2 receives the message',
      'Verify message appears in User 1\'s chat with "Sent" status',
      'Send a message from User 2 to User 1',
      'Verify bidirectional messaging works',
    ],
    expectedResults: [
      'Messages should appear instantly on both sides',
      'Message status should show "Sending..." then "Sent ✓"',
      'Messages should be properly aligned (me: right, stranger: left)',
      'Long messages should wrap correctly',
    ],
  },
  {
    id: 3,
    name: 'Typing Indicators',
    description: 'Test typing indicators display correctly for both users',
    steps: [
      "With two matched users, start typing in User 1's input",
      'Verify User 2 sees "Stranger is typing..." indicator',
      "Stop typing in User 1's input",
      'Verify typing indicator disappears for User 2 after 2 seconds',
      'Repeat test with User 2 typing',
    ],
    expectedResults: [
      'Typing indicator should appear within 300ms of typing',
      'Typing indicator should disappear 2 seconds after stopping',
      'Typing indicator should not spam (debounced)',
      'Typing indicator should be visible and accessible',
    ],
  },
  {
    id: 4,
    name: 'Next Button Functionality',
    description: 'Validate "Next" button disconnects and finds new match',
    steps: [
      'With two matched users (User 1 and User 2)',
      'Click "Next" button in User 1\'s chat',
      'Verify User 2 sees "Stranger left the chat" message',
      'Verify User 1 starts searching for a new match',
      'Open a third browser window (User 3) and click "Start Chatting"',
      'Verify User 1 gets matched with User 3',
    ],
    expectedResults: [
      'User 2 should see disconnect message immediately',
      'User 1 should clear chat and start searching',
      'User 1 should be able to match with a new user',
      'Previous chat history should be cleared',
    ],
  },
  {
    id: 5,
    name: 'Report Functionality',
    description: 'Test report functionality and ensure it logs violations',
    steps: [
      'With two matched users, click the "Report" button in User 1\'s chat',
      'Confirm the report in the dialog',
      'Verify User 1 is disconnected and searching for new match',
      'Check server logs or database for report entry',
      "Verify reported user's reputation is affected (if applicable)",
    ],
    expectedResults: [
      'Report confirmation dialog should appear',
      'After reporting, user should be disconnected',
      'Report should be logged in database with timestamp',
      'User should not be able to spam reports (rate limited)',
    ],
  },
  {
    id: 6,
    name: 'Reconnection Logic',
    description: 'Verify reconnection logic handles network interruptions gracefully',
    steps: [
      'Open application and get matched with another user',
      'Open browser DevTools > Network tab',
      'Set network throttling to "Offline"',
      'Verify "Reconnecting..." overlay appears',
      'Send a message while offline',
      'Set network back to "Online"',
      'Verify connection is restored',
      'Verify queued message is sent automatically',
    ],
    expectedResults: [
      'Reconnection overlay should appear when offline',
      'Messages should be queued while offline',
      'Connection should restore automatically when online',
      'Queued messages should be sent after reconnection',
      'No data loss should occur',
    ],
  },
  {
    id: 7,
    name: 'Message Queue and Retry Logic',
    description: 'Test message queue and retry logic for failed sends (lines 406-423 in chat.js)',
    steps: [
      'Match two users',
      'In User 1, open DevTools Console',
      'Type: `window.navigator.onLine = false` (simulate offline)',
      'Try to send a message',
      'Verify message shows "Sending..." status',
      'Type: `window.navigator.onLine = true`',
      'Verify message is retried and sent',
      'Test retry button on failed messages',
    ],
    expectedResults: [
      'Messages should queue when offline',
      'Messages should show "Sending..." status',
      'Failed messages should show "Failed" with retry button',
      'Retry button should resend the message',
      'Queue should process in order when back online',
    ],
  },
  {
    id: 8,
    name: 'Session Restoration',
    description: 'Ensure session restoration works after page refresh',
    steps: [
      'Match two users and exchange several messages',
      'In User 1, refresh the page (F5 or Ctrl+R)',
      'Verify chat history is restored from sessionStorage',
      'Verify connection state is restored',
      'Verify user sees "Connection lost due to page refresh" message',
      'Click "New Chat" to start fresh',
    ],
    expectedResults: [
      'Chat messages should be restored after refresh',
      'User should see disconnected state',
      'System message should explain the refresh',
      'User should be able to start a new chat',
      'No errors in console',
    ],
  },
  {
    id: 9,
    name: 'Banned User Handling',
    description: 'Test that banned users see appropriate message and cannot reconnect',
    steps: [
      'Access admin panel (admin.html)',
      'Login with admin credentials',
      'Add a test IP to the ban list',
      'Open application from that IP (or use IP hash)',
      'Verify banned message is displayed',
      'Verify all controls are disabled',
      'Verify user cannot connect or send messages',
      'Remove ban from admin panel',
    ],
    expectedResults: [
      'Banned users should see clear ban message',
      'All chat controls should be disabled',
      'User should not be able to bypass ban',
      'Ban reason should be displayed',
      'User should see appeal information (if implemented)',
    ],
  },
  {
    id: 10,
    name: 'Edge Cases',
    description: 'Test various edge cases and error conditions',
    steps: [
      'Try to send empty message (should be prevented)',
      'Try to send message with only whitespace',
      'Try to send message exceeding 1000 characters',
      'Try to send messages rapidly (test rate limiting)',
      'Try to report same user multiple times',
      'Test with slow network (throttle to 3G)',
      'Test with very high latency (2000ms+)',
      'Test keyboard shortcuts (Esc to trigger Next)',
    ],
    expectedResults: [
      'Empty messages should not be sent',
      'Long messages should be truncated or rejected',
      'Rate limiting should prevent spam',
      'Multiple reports should be prevented',
      'App should work on slow connections',
      'Connection quality indicator should update',
      'Keyboard shortcuts should work',
    ],
  },
];

async function runTests() {
  console.log(
    c('cyan', c('bold', '\n╔════════════════════════════════════════════════════════════╗'))
  );
  console.log(
    c('cyan', c('bold', '║   Critical User Journeys Testing Checklist                ║'))
  );
  console.log(
    c('cyan', c('bold', '╚════════════════════════════════════════════════════════════╝\n'))
  );

  console.log(
    c('yellow', 'This script will guide you through testing all critical user journeys.\n')
  );
  console.log(c('gray', 'Make sure the server is running before starting the tests.\n'));

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    notes: [],
  };

  for (const testCase of testCases) {
    console.log(c('white', c('bold', `\n${'='.repeat(60)}`)));
    console.log(c('cyan', c('bold', `Test ${testCase.id}: ${testCase.name}`)));
    console.log(c('white', c('bold', `${'='.repeat(60)}`)));
    console.log(c('gray', `Description: ${testCase.description}\n`));

    console.log(c('yellow', c('bold', 'Steps to perform:')));
    testCase.steps.forEach((step, index) => {
      console.log(c('white', `  ${index + 1}. ${step}`));
    });

    console.log(c('yellow', c('bold', '\nExpected Results:')));
    testCase.expectedResults.forEach((result, index) => {
      console.log(c('white', `  ✓ ${result}`));
    });

    console.log('');
    const answer = await ask(c('green', c('bold', 'Did the test pass? (y/n/s to skip): ')));

    if (answer.toLowerCase() === 'y') {
      results.passed++;
      console.log(c('green', '✓ Test passed!\n'));
    } else if (answer.toLowerCase() === 's') {
      results.skipped++;
      console.log(c('yellow', '⊘ Test skipped\n'));
    } else {
      results.failed++;
      console.log(c('red', '✗ Test failed\n'));
      const note = await ask(c('yellow', 'Add a note about the failure (optional): '));
      if (note) {
        results.notes.push(`Test ${testCase.id}: ${note}`);
      }
    }
  }

  // Summary
  console.log(c('white', c('bold', '\n' + '='.repeat(60))));
  console.log(c('cyan', c('bold', 'Test Summary')));
  console.log(c('white', c('bold', '='.repeat(60) + '\n')));

  console.log(c('green', `✓ Passed: ${results.passed}/${testCases.length}`));
  console.log(c('red', `✗ Failed: ${results.failed}/${testCases.length}`));
  console.log(c('yellow', `⊘ Skipped: ${results.skipped}/${testCases.length}`));

  const passRate = ((results.passed / testCases.length) * 100).toFixed(1);
  console.log(c('cyan', c('bold', `\nPass Rate: ${passRate}%\n`)));

  if (results.notes.length > 0) {
    console.log(c('yellow', c('bold', 'Notes:')));
    results.notes.forEach((note) => {
      console.log(c('gray', `  - ${note}`));
    });
    console.log('');
  }

  if (results.failed === 0 && results.passed === testCases.length) {
    console.log(
      c('green', c('bold', '🎉 All tests passed! The application is ready for production.\n'))
    );
  } else if (results.failed > 0) {
    console.log(c('red', c('bold', '⚠️  Some tests failed. Please review and fix the issues.\n')));
  }

  rl.close();
}

// Run the tests
runTests().catch((err) => {
  console.error(c('red', 'Error running tests:'), err);
  rl.close();
  process.exit(1);
});
