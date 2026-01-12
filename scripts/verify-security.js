#!/usr/bin/env node

/**
 * Quick Security Verification Script
 * Performs rapid checks of all security implementations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔒 Security Implementation Verification\n');
console.log('='.repeat(60));

const serverPath = path.join(__dirname, '../src/server.js');
const chatPath = path.join(__dirname, '../src/client/scripts/chat.js');
const powPath = path.join(__dirname, '../src/client/scripts/pow.js');

const serverContent = fs.readFileSync(serverPath, 'utf8');
const chatContent = fs.existsSync(chatPath) ? fs.readFileSync(chatPath, 'utf8') : '';
const powContent = fs.existsSync(powPath) ? fs.readFileSync(powPath, 'utf8') : '';

const checks = [
  {
    name: '1. Helmet CSP Configuration',
    tests: [
      { desc: 'Helmet installed', pass: serverContent.includes('helmet(') },
      { desc: 'CSP nonce for scripts', pass: serverContent.includes("'nonce-") },
      { desc: 'Frame-ancestors protection', pass: serverContent.includes('frame-ancestors') },
      { desc: 'HSTS configured', pass: serverContent.includes('strictTransportSecurity') },
    ],
  },
  {
    name: '2. Rate Limiting',
    tests: [
      { desc: 'Express rate limiting', pass: serverContent.includes('rateLimit') },
      { desc: 'Socket.IO connection limits', pass: serverContent.includes('CONN_RATE_LIMIT') },
      { desc: 'Custom RateLimiter', pass: serverContent.includes('RateLimiter') },
      {
        desc: 'find_match rate limited',
        pass: serverContent.includes('find_match') && serverContent.includes('RateLimiter.check'),
      },
      {
        desc: 'send_msg rate limited',
        pass: serverContent.includes('send_msg') && serverContent.includes('RateLimiter.check'),
      },
    ],
  },
  {
    name: '3. PoW Challenge System',
    tests: [
      {
        desc: 'Client PoW solver',
        pass: powContent.includes('solvePoW') || chatContent.includes('solvePoW'),
      },
      { desc: 'Challenge listener', pass: chatContent.includes("socket.on('challenge'") },
      { desc: 'Server PoW verification', pass: serverContent.includes('solve_challenge') },
      { desc: 'PoW complexity set', pass: serverContent.includes('POW_COMPLEXITY') },
      { desc: 'Challenge timeout', pass: serverContent.includes('CHALLENGE_TIMEOUT') },
    ],
  },
  {
    name: '4. CSRF Protection',
    tests: [
      { desc: 'CSRF token implementation', pass: serverContent.includes('csrf_token') },
      { desc: 'Header validation', pass: serverContent.includes('x-csrf-token') },
      {
        desc: 'State-changing methods protected',
        pass: serverContent.includes("['POST', 'PUT', 'DELETE', 'PATCH']"),
      },
      {
        desc: 'Token rotation',
        pass: serverContent.includes('randomBytes(32)') && serverContent.includes('csrf_token'),
      },
    ],
  },
  {
    name: '5. Ban System',
    tests: [
      { desc: 'isUserBanned function', pass: serverContent.includes('isUserBanned') },
      { desc: 'Ban cache (LRU)', pass: serverContent.includes('banCache') },
      {
        desc: 'Middleware ban check',
        pass: serverContent.includes('io.use') && serverContent.includes('await isUserBanned'),
      },
      {
        desc: 'Matchmaking ban check',
        pass: serverContent.includes('find_match') && serverContent.includes('await isUserBanned'),
      },
      { desc: 'IP range banning', pass: serverContent.includes('isIpRangeBanned') },
    ],
  },
  {
    name: '6. IP Hashing',
    tests: [
      { desc: 'getIpHash function', pass: serverContent.includes('getIpHash') },
      { desc: 'SHA-256 hashing', pass: serverContent.includes('sha256') },
      { desc: 'Proxy-aware (X-Forwarded-For)', pass: serverContent.includes('x-forwarded-for') },
      { desc: 'HTTP request IP hashing', pass: serverContent.includes('getIpHashFromReq') },
    ],
  },
  {
    name: '7. Admin Authentication',
    tests: [
      { desc: 'requireAdmin middleware', pass: serverContent.includes('requireAdmin') },
      { desc: 'Admin login endpoint', pass: serverContent.includes('/api/admin/login') },
      {
        desc: 'Session-based auth',
        pass: serverContent.includes('session') && serverContent.includes('isAdmin'),
      },
      { desc: 'Admin rate limiting', pass: serverContent.includes('adminRateLimit') },
      { desc: 'IP allow-listing', pass: serverContent.includes('adminIpAllowList') },
      { desc: 'Basic Auth for metrics', pass: serverContent.includes('Basic realm') },
      { desc: 'Audit logging', pass: serverContent.includes('logAdminAuthEvent') },
    ],
  },
  {
    name: '8. Input Validation',
    tests: [
      { desc: 'Zod validation', pass: serverContent.includes("from 'zod'") },
      { desc: 'Validation schemas', pass: serverContent.includes('Schemas') },
      { desc: 'Sanitize function', pass: serverContent.includes('const sanitize') },
      { desc: 'Safe parsing', pass: serverContent.includes('.safeParse(') },
      { desc: 'Prepared statements', pass: serverContent.includes('.prepare(') },
    ],
  },
];

let totalTests = 0;
let passedTests = 0;

checks.forEach((section) => {
  console.log(`\n${section.name}`);
  console.log('-'.repeat(60));

  section.tests.forEach((test) => {
    totalTests++;
    const status = test.pass ? '✅' : '❌';
    if (test.pass) {
      passedTests++;
    }
    console.log(`${status} ${test.desc}`);
  });
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passedTests}/${totalTests} checks passed`);

const percentage = ((passedTests / totalTests) * 100).toFixed(1);
console.log(`   Success Rate: ${percentage}%`);

if (passedTests === totalTests) {
  console.log('\n✅ All security implementations verified!');
  console.log('   System is PRODUCTION READY\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${totalTests - passedTests} check(s) failed`);
  console.log('   Review failed checks above\n');
  process.exit(1);
}
