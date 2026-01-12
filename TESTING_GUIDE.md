# Critical User Journeys Testing Guide

This document provides comprehensive testing instructions for all critical user journeys in the STRNGR chat application.

## Table of Contents

1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Running Tests](#running-tests)
4. [Critical User Journeys](#critical-user-journeys)
5. [Test Results](#test-results)
6. [Troubleshooting](#troubleshooting)

## Overview

The STRNGR application has been thoroughly tested across multiple critical user journeys to ensure reliability, performance, and user experience quality. This guide covers:

- **Automated Unit Tests**: Jest-based tests for individual components
- **Integration Tests**: Socket.IO and server-side integration tests
- **E2E Tests**: Playwright-based browser automation tests
- **Manual Testing**: Guided manual testing checklist

## Test Environment Setup

### Prerequisites

1. **Node.js** v18+ installed
2. **npm** v9+ installed
3. **Playwright** browsers installed (for E2E tests)
4. Server running on `http://localhost:3000` (or configured port)

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Environment Configuration

Ensure your `.env` file is properly configured:

```env
NODE_ENV=test
PORT=3000
DB_NAME=:memory:
SESSION_SECRET=test-secret-key-min-32-chars-long
ADMIN_PASSWORD=test-admin-password
```

## Running Tests

### 1. Automated Unit & Integration Tests

Run all Jest-based tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run only critical journey tests
npm run test:critical
```

### 2. End-to-End (E2E) Tests

Run Playwright E2E tests:

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with browser visible
npm run test:e2e:headed

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### 3. Manual Testing

Run the interactive manual testing script:

```bash
npm run test:manual
```

This will guide you through each critical journey with step-by-step instructions.

### 4. Run All Tests

```bash
npm run test:all
```

This runs unit tests, critical journey tests, and E2E tests in sequence.

## Critical User Journeys

### 1. Matchmaking Flow

**Objective**: Verify users can successfully match with each other

**Test Steps**:
1. Open application in two browser windows/tabs
2. Click "Start Chatting" in both windows
3. Verify both users see "Searching for a stranger..." message
4. Verify both users get matched within 10 seconds
5. Verify chat interface becomes active

**Expected Results**:
- ✅ Both users matched within 10 seconds
- ✅ Chat status updates from "Searching" to "Connected"
- ✅ Message input and send button enabled
- ✅ Online count visible and accurate

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Matchmaking Flow"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Two users can match successfully"

---

### 2. Message Sending and Receiving

**Objective**: Verify bidirectional messaging works correctly

**Test Steps**:
1. Match two users (User 1 and User 2)
2. User 1 types and sends a message
3. Verify User 2 receives the message
4. Verify message status shows "Sent ✓" for User 1
5. User 2 sends a reply
6. Verify User 1 receives the reply

**Expected Results**:
- ✅ Messages appear instantly on both sides
- ✅ Message status: "Sending..." → "Sent ✓"
- ✅ Messages properly aligned (me: right, stranger: left)
- ✅ Long messages wrap correctly
- ✅ Multiple messages delivered in order

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Message Sending and Receiving"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Messages are exchanged between matched users"

**Code Reference**: `src/client/scripts/chat.js` lines 327-404

---

### 3. Typing Indicators

**Objective**: Verify typing indicators display correctly for both users

**Test Steps**:
1. Match two users
2. User 1 starts typing in the message input
3. Verify User 2 sees "Stranger is typing..." indicator
4. User 1 stops typing
5. Verify typing indicator disappears after 2 seconds
6. Repeat with User 2 typing

**Expected Results**:
- ✅ Typing indicator appears within 300ms of typing
- ✅ Typing indicator disappears 2 seconds after stopping
- ✅ Typing indicator is debounced (not spamming)
- ✅ Typing indicator is visible and accessible

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Typing Indicators"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Typing indicator displays correctly"

**Code Reference**: `src/client/scripts/chat.js` lines 701-761 (TypingManager)

---

### 4. Next Button Functionality

**Objective**: Validate "Next" button disconnects and finds new match

**Test Steps**:
1. Match User 1 and User 2
2. User 1 clicks "Next" button
3. Verify User 2 sees "Stranger left the chat" message
4. Verify User 1 starts searching for new match
5. User 3 joins and clicks "Start Chatting"
6. Verify User 1 matches with User 3

**Expected Results**:
- ✅ User 2 sees disconnect message immediately
- ✅ User 1 clears chat and starts searching
- ✅ User 1 can match with a new user
- ✅ Previous chat history is cleared

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Next Button Functionality"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Next button disconnects and finds new match"

**Code Reference**: `src/client/scripts/chat.js` lines 247-275

---

### 5. Report Functionality

**Objective**: Test report functionality and ensure it logs violations

**Test Steps**:
1. Match two users
2. User 1 clicks "Report" button
3. Confirm the report in the dialog
4. Verify User 1 is disconnected and searching for new match
5. Check database for report entry
6. Verify reported user's reputation is affected

**Expected Results**:
- ✅ Report confirmation dialog appears
- ✅ After reporting, user is disconnected
- ✅ Report logged in database with timestamp
- ✅ User cannot spam reports (rate limited)

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Report Functionality"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Report button works and disconnects user"

**Code Reference**: `src/client/scripts/chat.js` lines 297-307

---

### 6. Reconnection Logic

**Objective**: Verify reconnection logic handles network interruptions gracefully

**Test Steps**:
1. Match two users
2. Open browser DevTools > Network tab
3. Set network throttling to "Offline"
4. Verify "Reconnecting..." overlay appears
5. Try to send a message while offline
6. Set network back to "Online"
7. Verify connection is restored
8. Verify queued message is sent automatically

**Expected Results**:
- ✅ Reconnection overlay appears when offline
- ✅ Messages are queued while offline
- ✅ Connection restores automatically when online
- ✅ Queued messages sent after reconnection
- ✅ No data loss occurs

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Reconnection Logic"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Handles network interruptions gracefully"

**Code Reference**: 
- `src/client/scripts/chat.js` lines 29-39 (Socket.IO config)
- `src/client/scripts/chat.js` lines 149-158 (Reconnect handler)
- `src/client/scripts/chat.js` lines 184-197 (Network listeners)

---

### 7. Message Queue and Retry Logic

**Objective**: Test message queue and retry logic for failed sends

**Test Steps**:
1. Match two users
2. In User 1, open DevTools Console
3. Simulate offline: `window.navigator.onLine = false`
4. Try to send a message
5. Verify message shows "Sending..." status
6. Simulate online: `window.navigator.onLine = true`
7. Verify message is retried and sent
8. Test retry button on failed messages

**Expected Results**:
- ✅ Messages queue when offline
- ✅ Messages show "Sending..." status
- ✅ Failed messages show "Failed" with retry button
- ✅ Retry button resends the message
- ✅ Queue processes in order when back online

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Message Queue and Retry Logic"

**Code Reference**: `src/client/scripts/chat.js` lines 406-453
- `processMessageQueue()` - lines 406-423
- `handleSendSuccess()` - lines 425-432
- `handleSendFailure()` - lines 434-453

---

### 8. Session Restoration

**Objective**: Ensure session restoration works after page refresh

**Test Steps**:
1. Match two users and exchange several messages
2. In User 1, refresh the page (F5 or Ctrl+R)
3. Verify chat history is restored from sessionStorage
4. Verify connection state is restored
5. Verify user sees "Connection lost due to page refresh" message
6. Click "New Chat" to start fresh

**Expected Results**:
- ✅ Chat messages restored after refresh
- ✅ User sees disconnected state
- ✅ System message explains the refresh
- ✅ User can start a new chat
- ✅ No errors in console

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Session Restoration"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Chat state is restored after page refresh"

**Code Reference**: `src/client/scripts/chat.js` lines 485-542
- `saveChatState()` - lines 485-503
- `restoreChatState()` - lines 505-542

---

### 9. Banned User Handling

**Objective**: Test that banned users see appropriate message and cannot reconnect

**Test Steps**:
1. Access admin panel (admin.html)
2. Login with admin credentials
3. Add a test IP to the ban list
4. Open application from that IP
5. Verify banned message is displayed
6. Verify all controls are disabled
7. Verify user cannot connect or send messages
8. Remove ban from admin panel

**Expected Results**:
- ✅ Banned users see clear ban message
- ✅ All chat controls disabled
- ✅ User cannot bypass ban
- ✅ Ban reason is displayed
- ✅ User sees appeal information (if implemented)

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Banned User Handling"

**Code Reference**: `src/client/scripts/chat.js` lines 235-245 (handleBan)

---

### 10. Edge Cases and Error Handling

**Objective**: Test various edge cases and error conditions

**Test Cases**:
- Empty messages (should be prevented)
- Messages with only whitespace
- Messages exceeding 1000 characters
- Rapid message sending (rate limiting)
- Multiple reports on same user
- Slow network (3G throttling)
- Very high latency (2000ms+)
- Keyboard shortcuts (Esc to trigger Next)

**Expected Results**:
- ✅ Empty messages not sent
- ✅ Long messages truncated or rejected
- ✅ Rate limiting prevents spam
- ✅ Multiple reports prevented
- ✅ App works on slow connections
- ✅ Connection quality indicator updates
- ✅ Keyboard shortcuts work

**Test Coverage**:
- Unit Test: `src/__tests__/critical-journeys.test.js` - "Edge Cases and Error Handling"
- E2E Test: `src/__tests__/e2e-critical-journeys.spec.js` - "Edge Cases"

---

## Test Results

### Automated Test Results

After running `npm run test:all`, you should see output similar to:

```
PASS  src/__tests__/critical-journeys.test.js
  Critical User Journeys
    1. Matchmaking Flow
      ✓ User clicks "Start Chatting" and gets matched with another user (5000ms)
      ✓ Online count updates correctly (2000ms)
    2. Message Sending and Receiving
      ✓ Messages are sent and received correctly between matched users (8000ms)
      ✓ Multiple messages are delivered in order (15000ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        45.123 s
```

### E2E Test Results

```
Running 20 tests using 2 workers

  ✓  [chromium] › e2e-critical-journeys.spec.js:15:5 › Critical User Journeys - E2E › 1. Matchmaking Flow › Two users can match successfully (8.5s)
  ✓  [chromium] › e2e-critical-journeys.spec.js:45:5 › Critical User Journeys - E2E › 2. Message Sending and Receiving › Messages are exchanged between matched users (10.2s)
  ...

  20 passed (2.5m)
```

### Manual Test Results

Use the manual testing script to track results:

```bash
npm run test:manual
```

Results will be summarized at the end with pass rate and notes.

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

**Problem**: Tests fail with timeout errors

**Solutions**:
- Increase timeout in test configuration
- Check server is running on correct port
- Verify database is accessible
- Check network connectivity

#### 2. Socket Connection Failures

**Problem**: Socket.IO connections fail in tests

**Solutions**:
- Ensure server is running before tests
- Check CORS configuration
- Verify Socket.IO transports are configured correctly
- Check firewall settings

#### 3. E2E Tests Failing

**Problem**: Playwright E2E tests fail

**Solutions**:
- Install Playwright browsers: `npx playwright install`
- Check browser compatibility
- Increase wait timeouts for slow systems
- Run in headed mode to debug: `npm run test:e2e:headed`

#### 4. Database Errors

**Problem**: Database-related test failures

**Solutions**:
- Ensure `DB_NAME=:memory:` in test environment
- Check database schema is up to date
- Verify migrations have run
- Clear test database between runs

### Debug Mode

Run tests in debug mode for detailed output:

```bash
# Jest tests with verbose output
npm test -- --verbose

# Playwright tests in debug mode
npm run test:e2e:debug

# Enable debug logging
DEBUG=* npm test
```

### Test Coverage

Generate and view test coverage report:

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage.

## Continuous Integration

### GitHub Actions

Example CI configuration:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:all
```

## Best Practices

1. **Run tests before committing**: `npm test`
2. **Test on multiple browsers**: Use Playwright's multi-browser support
3. **Keep tests isolated**: Each test should be independent
4. **Use realistic data**: Test with production-like scenarios
5. **Monitor test performance**: Keep tests fast (<30s per test)
6. **Update tests with features**: Add tests for new functionality
7. **Review failed tests**: Don't ignore flaky tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Socket.IO Testing Guide](https://socket.io/docs/v4/testing/)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For issues or questions about testing:
1. Check this documentation
2. Review test files for examples
3. Check server logs for errors
4. Open an issue in the repository

---

**Last Updated**: 2026-01-12
**Version**: 1.0.0
