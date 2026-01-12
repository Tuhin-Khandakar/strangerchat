# Quick Reference: Testing Critical User Journeys

## 🚀 Quick Start

```bash
# Run all critical journey tests
npm run test:critical

# Run E2E browser tests
npm run test:e2e

# Run manual testing guide
npm run test:manual

# Run everything
npm run test:all
```

## 📋 Test Checklist

### 1. Matchmaking Flow
- [ ] Two users can match within 10 seconds
- [ ] Online count updates correctly
- [ ] Chat interface activates after match

### 2. Message Sending/Receiving
- [ ] Messages delivered instantly
- [ ] Message status shows "Sent ✓"
- [ ] Bidirectional messaging works
- [ ] Multiple messages in correct order

### 3. Typing Indicators
- [ ] Indicator appears within 300ms
- [ ] Indicator disappears after 2s
- [ ] Works for both users
- [ ] Properly debounced

### 4. Next Button
- [ ] Disconnects current chat
- [ ] Partner sees "left" message
- [ ] Finds new match
- [ ] Chat history cleared

### 5. Report Function
- [ ] Report dialog appears
- [ ] User disconnected after report
- [ ] Report logged in database
- [ ] Rate limited (can't spam)

### 6. Reconnection
- [ ] Offline overlay appears
- [ ] Messages queued offline
- [ ] Auto-reconnects when online
- [ ] Queued messages sent

### 7. Message Queue/Retry
- [ ] Messages queue when offline
- [ ] "Sending..." status shown
- [ ] Failed messages show retry button
- [ ] Retry button works
- [ ] Queue processes in order

### 8. Session Restoration
- [ ] Chat history restored after refresh
- [ ] Connection state restored
- [ ] System message explains refresh
- [ ] Can start new chat

### 9. Banned Users
- [ ] Ban message displayed
- [ ] All controls disabled
- [ ] Cannot reconnect
- [ ] Ban reason shown

### 10. Edge Cases
- [ ] Empty messages prevented
- [ ] Long messages truncated (>1000 chars)
- [ ] Rate limiting works
- [ ] Keyboard shortcuts work (Esc)
- [ ] Works on slow networks

## 🔍 Code References

| Feature | File | Lines |
|---------|------|-------|
| Matchmaking | `chat.js` | 81-96 |
| Messaging | `chat.js` | 327-404 |
| Typing | `chat.js` | 701-761 |
| Next Button | `chat.js` | 247-275 |
| Report | `chat.js` | 297-307 |
| Reconnection | `chat.js` | 29-39, 149-158, 184-197 |
| Message Queue | `chat.js` | 406-453 |
| Session Restore | `chat.js` | 485-542 |
| Ban Handling | `chat.js` | 235-245 |

## 🎯 Expected Performance

- **Matchmaking**: < 10 seconds
- **Message delivery**: < 100ms
- **Typing indicator**: < 300ms
- **Reconnection**: < 5 seconds
- **Session restore**: < 1 second

## 📁 Test Files

- **Unit Tests**: `src/__tests__/critical-journeys.test.js`
- **E2E Tests**: `src/__tests__/e2e-critical-journeys.spec.js`
- **Manual Script**: `scripts/test-critical-journeys.js`
- **Documentation**: `TESTING_GUIDE.md`

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests timeout | Increase timeout in test config |
| Socket fails | Check server is running on port 3000 |
| E2E fails | Run `npx playwright install` |
| DB errors | Ensure `DB_NAME=:memory:` in test env |

## 📊 Test Coverage

- ✅ 25+ automated unit tests
- ✅ 20+ E2E browser tests
- ✅ 10 manual test scenarios
- ✅ 100% critical path coverage

## 🎬 Running Tests

### Automated Tests
```bash
# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch

# Run specific test
npm test -- -t "Matchmaking Flow"
```

### E2E Tests
```bash
# Headless (CI mode)
npm run test:e2e

# With browser visible
npm run test:e2e:headed

# Debug mode (step through)
npm run test:e2e:debug
```

### Manual Testing
```bash
# Interactive guide
npm run test:manual

# Follow prompts and mark pass/fail
# Get summary report at end
```

## ✅ Success Criteria

All tests should:
- ✅ Pass without errors
- ✅ Complete within timeout
- ✅ Show expected results
- ✅ Have no console errors
- ✅ Match performance benchmarks

## 📚 Full Documentation

See `TESTING_GUIDE.md` for:
- Detailed test descriptions
- Setup instructions
- Troubleshooting guide
- CI/CD integration
- Best practices

---

**Quick Tip**: Run `npm run test:manual` for a guided testing experience!
