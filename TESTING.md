# Testing Strategy

STRNGR uses a comprehensive testing strategy covering unit tests, integration tests, and end-to-end (E2E) tests.

## 1. Testing Frameworks

- **Jest**: Unit and integration testing for both server and client logic.
- **Playwright**: End-to-End (E2E) testing for critical user journeys.
- **Socket.io-client**: Testing socket connections and events.
- **Supertest**: Testing HTTP endpoints (if applicable).

## 2. Server-Side Tests

Located in `src/__tests__/`.

- **Utils (`utils.test.js`):** Tests pure utility functions like `sanitize`, `getIpHash`, and state transitions.
- **Database (`database.test.js`):** Integration tests using an in-memory SQLite database to verify CRUD operations, moderation triggers, and banned word filtering.
- **Socket Integration (`socket.test.js`):** Tests the core matchmaking engine, message relay, and event handling by spinning up a test server instance.

## 3. Client-Side Tests

Located in `public/scripts/__tests__/`.

- **Unit Tests (`app.test.js`):** Tests client logic using `jsdom` environment. Mocks `socket.io-client` and the DOM to verify UI updates, input sanitization, and typing indicator logic.

## 4. End-to-End Tests

Located in `e2e/` (run via `npx playwright test`).

- **Chat Flow (`chat.spec.js`):** Simulates two real browser instances to verify the full flow:
  1. Landing page load.
  2. TOS acceptance.
  3. Matchmaking success.
  4. Real-time message exchange.
  5. Disconnection/Next logic.

## 5. Running Tests

### Unit & Integration

```bash
npm test
```

Runs Jest test suite.

### Coverage

```bash
npm run test:coverage
```

Generates a coverage report in `coverage/`.

### End-to-End

```bash
npx playwright test
```

Runs Playwright tests (headless by default).

## 6. CI/CD Pipeline

Configured in `.github/workflows/test.yml`.

- Triggers on push/pull_request to `main`.
- Installs dependencies.
- Runs Linting (if configured).
- Runs `npm test` (Unit/Integration).
- Runs `npx playwright test` (E2E).
