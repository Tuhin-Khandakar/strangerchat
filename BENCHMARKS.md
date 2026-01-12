# Performance Benchmarks & Optimization Guide

## Benchmark Setup

Tests conducted using the provided load test script (`scripts/load-test.js`) and Vite build reporter.

| Metric                           | Target   | Result (Current)   |
| :------------------------------- | :------- | :----------------- |
| **JS Bundle Size**               | < 200 KB | ~140 KB (Gzipped)  |
| **CSS Bundle Size**              | < 50 KB  | ~12 KB (Gzipped)   |
| **Matched Latency**              | < 100ms  | ~45ms              |
| **Msg Delivery**                 | < 50ms   | ~18ms              |
| **Max Concurrent (Single Node)** | 5,000    | Tested up to 2,500 |

---

## Optimizations Implemented

- **Code Splitting**: Admin panel logic separated into `admin.js` chunk.
- **Lazy Loading**: Admin dependencies only fetch when the admin route is accessed.
- **Resource Hints**: `preload` for main JS, `preconnect` for fonts, `prefetch` for secondary pages.
- **PWA Caching**: Stale-while-revalidate for assets, Cache-first for images.
- **DB Optimization**:
  - WAL Journal Mode.
  - Connection pooling via `better-sqlite3`.
  - Batching writes for filter violations.
  - LRU Caching for ban checks.
- **Asset Compression**: Brotli + Gzip pre-compression in the build pipeline.

## Optimization Notes

- **Database Performance**: The switch to WAL mode and batching violations has increased write throughput by ~4x compared to immediate single-row inserts.
- **Latency**: Socket.IO's PoW challenge adds ~100-300ms to the _initial_ connection (depending on client CPU) but prevents connection flooding.
- **Bundle Size**: Terser minification and careful dependency management keep the main chat logic under the 150KB threshold.

## Future Targets (Q1 2026)

- [ ] **Zero-Downtime Deploys**: Implement blue-green deployment with sticky sessions.
- [ ] **E2E Latency**: Sub-10ms message delivery in regional deployments.
- [ ] **Scalability**: Support 10,000 concurrent users on a single $20/mo VPS.
- [ ] **Accessibility**: 100/100 Lighthouse Accessibility score (currently 94).
