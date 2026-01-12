# Contributing

We welcome contributions to STRNGR!

## Development Setup

1. Fork and clone the repository.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Start development: `npm run dev`.

## Guidelines

- **Code Style**: We use Prettier and ESLint. Run `npm run lint` and `npm run format`.
- **Testing**: Ensure all tests pass with `npm test`.
- **Commits**: Use descriptive commit messages (e.g., `feat: add user feedback endpoint`).
- **PRs**: Keep PRs small and focused on a single feature or bug fix.

## Testing Standards

- **Unit Tests**: Required for new utility functions in `src/client/scripts/utils.js`.
- **E2E Tests**: Required for user-facing flows using Playwright.
- **Performance**: Ensure build size doesn't exceed 200KB JS / 50KB CSS.

## Security

Please report security vulnerabilities following the steps in `SECURITY.md`. Do NOT open public issues for vulnerabilities.
