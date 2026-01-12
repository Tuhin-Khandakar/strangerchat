#!/usr/bin/env node

/**
 * Security Audit Script
 * Verifies all security configurations are production-ready
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function pass(check) {
  results.passed.push(check);
  log(`✓ ${check}`, 'green');
}

function fail(check, details) {
  results.failed.push({ check, details });
  log(`✗ ${check}`, 'red');
  if (details) {
    log(`  ${details}`, 'red');
  }
}

function warn(check, details) {
  results.warnings.push({ check, details });
  log(`⚠ ${check}`, 'yellow');
  if (details) {
    log(`  ${details}`, 'yellow');
  }
}

log('\n' + '='.repeat(60), 'bold');
log('Security Audit Report', 'bold');
log('='.repeat(60) + '\n', 'bold');

// 1. Check Helmet CSP Configuration
log('1. Helmet CSP Configuration', 'blue');
const serverPath = path.join(__dirname, '../src/server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

if (serverContent.includes('helmet(')) {
  pass('Helmet middleware is installed');
} else {
  fail('Helmet middleware not found');
}

if (serverContent.includes('contentSecurityPolicy')) {
  pass('CSP configuration exists');

  // Check specific CSP directives
  if (serverContent.includes("'nonce-")) {
    pass('CSP uses nonce for scripts');
  } else {
    fail('CSP missing nonce implementation');
  }

  if (serverContent.includes('frame-ancestors')) {
    pass('CSP includes frame-ancestors directive');
  } else {
    warn('CSP missing frame-ancestors directive');
  }

  if (serverContent.includes("'none'") && serverContent.includes('object-src')) {
    pass('CSP restricts object-src');
  } else {
    warn('CSP object-src not properly restricted');
  }
} else {
  fail('CSP configuration not found');
}

if (serverContent.includes('strictTransportSecurity')) {
  pass('HSTS is configured');
} else {
  warn('HSTS not configured');
}

if (serverContent.includes('xFrameOptions')) {
  pass('X-Frame-Options header configured');
} else {
  warn('X-Frame-Options not configured');
}

// 2. Rate Limiting
log('\n2. Rate Limiting Configuration', 'blue');

if (serverContent.includes('express-rate-limit') || serverContent.includes('rateLimit')) {
  pass('Express rate limiting installed');
} else {
  fail('Express rate limiting not found');
}

if (serverContent.includes('CONN_RATE_LIMIT')) {
  pass('Socket.IO connection rate limiting configured');
} else {
  fail('Socket.IO connection rate limiting not found');
}

if (serverContent.includes('RateLimiter')) {
  pass('Custom rate limiter implementation found');
} else {
  warn('Custom rate limiter not found');
}

// Check for rate limiting on specific events
if (serverContent.includes('find_match') && serverContent.includes('RateLimiter.check')) {
  pass('Rate limiting on find_match event');
} else {
  warn('find_match event may not be rate limited');
}

if (serverContent.includes('send_msg') && serverContent.includes('RateLimiter.check')) {
  pass('Rate limiting on send_msg event');
} else {
  warn('send_msg event may not be rate limited');
}

// 3. PoW Challenge System
log('\n3. Proof of Work Challenge System', 'blue');

const chatPath = path.join(__dirname, '../client/scripts/chat.js');
if (fs.existsSync(chatPath)) {
  const chatContent = fs.readFileSync(chatPath, 'utf8');

  if (chatContent.includes('solvePoW')) {
    pass('Client-side PoW solver implemented');
  } else {
    fail('Client-side PoW solver not found');
  }

  if (chatContent.includes("socket.on('challenge'")) {
    pass('Client listens for challenge event');
  } else {
    fail('Client challenge listener not found');
  }
} else {
  warn('chat.js not found at expected location');
}

if (serverContent.includes('POW_COMPLEXITY')) {
  pass('PoW complexity configured');

  const complexityMatch = serverContent.match(/POW_COMPLEXITY:\s*(\d+)/);
  if (complexityMatch) {
    const complexity = parseInt(complexityMatch[1]);
    if (complexity >= 3 && complexity <= 5) {
      pass(`PoW complexity is ${complexity} (reasonable)`);
    } else if (complexity < 3) {
      warn(`PoW complexity is ${complexity} (may be too low)`);
    } else {
      warn(`PoW complexity is ${complexity} (may be too high)`);
    }
  }
} else {
  fail('PoW complexity not configured');
}

if (serverContent.includes('solve_challenge')) {
  pass('Server-side PoW verification implemented');
} else {
  fail('Server-side PoW verification not found');
}

if (serverContent.includes('CHALLENGE_TIMEOUT')) {
  pass('Challenge timeout configured');
} else {
  warn('Challenge timeout not configured');
}

// 4. CSRF Protection
log('\n4. CSRF Protection', 'blue');

if (serverContent.includes('csrf_token')) {
  pass('CSRF token implementation found');
} else {
  fail('CSRF token implementation not found');
}

if (serverContent.includes('x-csrf-token')) {
  pass('CSRF token header validation');
} else {
  fail('CSRF header validation not found');
}

if (serverContent.includes("['POST', 'PUT', 'DELETE', 'PATCH']")) {
  pass('CSRF protection on state-changing methods');
} else {
  warn('CSRF protection may not cover all methods');
}

// 5. Ban System
log('\n5. Ban Detection and Prevention', 'blue');

if (serverContent.includes('isUserBanned')) {
  pass('Ban checking function implemented');
} else {
  fail('Ban checking function not found');
}

if (serverContent.includes('banCache')) {
  pass('Ban cache implemented for performance');
} else {
  warn('Ban cache not found');
}

if (serverContent.includes('banned_until')) {
  pass('Temporary ban system implemented');
} else {
  fail('Temporary ban system not found');
}

if (serverContent.includes('await isUserBanned') && serverContent.includes('find_match')) {
  pass('Ban check during matchmaking');
} else {
  fail('Ban check during matchmaking not found');
}

if (serverContent.includes('io.use') && serverContent.includes('await isUserBanned')) {
  pass('Ban check in Socket.IO middleware');
} else {
  warn('Ban check in middleware may be missing');
}

// 6. IP Hashing
log('\n6. IP Hashing and Privacy', 'blue');

if (serverContent.includes('getIpHash')) {
  pass('IP hashing function implemented');
} else {
  fail('IP hashing function not found');
}

if (serverContent.includes('sha256')) {
  pass('SHA-256 used for IP hashing');
} else {
  warn('IP hashing algorithm unclear');
}

if (serverContent.includes('x-forwarded-for')) {
  pass('Proxy-aware IP detection');
} else {
  warn('May not handle proxied requests correctly');
}

// 7. Admin Authentication
log('\n7. Admin Panel Authentication', 'blue');

if (serverContent.includes('requireAdmin')) {
  pass('Admin authentication middleware exists');
} else {
  fail('Admin authentication middleware not found');
}

if (serverContent.includes('ADMIN_PASSWORD')) {
  pass('Admin password environment variable used');
} else {
  fail('Admin password not configured');
}

if (serverContent.includes('session') && serverContent.includes('isAdmin')) {
  pass('Session-based admin authentication');
} else {
  fail('Session-based admin auth not found');
}

if (serverContent.includes('/api/admin/login')) {
  pass('Admin login endpoint exists');
} else {
  fail('Admin login endpoint not found');
}

if (
  serverContent.includes('adminRateLimit') ||
  (serverContent.includes('admin') && serverContent.includes('rate'))
) {
  pass('Admin login rate limiting');
} else {
  warn('Admin login may not be rate limited');
}

if (serverContent.includes('Basic realm') || serverContent.includes('basic-auth')) {
  pass('Basic Auth for metrics endpoint');
} else {
  warn('Basic Auth for metrics may be missing');
}

// 8. Environment Variables
log('\n8. Environment Configuration', 'blue');

const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');

if (fs.existsSync(envPath)) {
  pass('.env file exists');

  const envContent = fs.readFileSync(envPath, 'utf8');

  if (envContent.includes('ADMIN_PASSWORD=')) {
    pass('ADMIN_PASSWORD is set');

    if (
      envContent.includes('ADMIN_PASSWORD=password') ||
      envContent.includes('ADMIN_PASSWORD=admin') ||
      envContent.includes('ADMIN_PASSWORD=123')
    ) {
      fail('ADMIN_PASSWORD appears to be a weak default');
    }
  } else {
    fail('ADMIN_PASSWORD not set in .env');
  }

  if (envContent.includes('SESSION_SECRET=')) {
    pass('SESSION_SECRET is set');
  } else {
    warn('SESSION_SECRET not set');
  }

  if (envContent.includes('NODE_ENV=')) {
    const nodeEnv = envContent.match(/NODE_ENV=(\w+)/)?.[1];
    if (nodeEnv === 'production') {
      pass('NODE_ENV set to production');
    } else {
      warn(`NODE_ENV is ${nodeEnv}, not production`);
    }
  }
} else {
  warn('.env file not found');
}

if (fs.existsSync(envExamplePath)) {
  pass('.env.example exists for reference');
} else {
  warn('.env.example not found');
}

// 9. Input Validation
log('\n9. Input Validation', 'blue');

if (serverContent.includes('zod') || serverContent.includes("from 'zod'")) {
  pass('Zod validation library imported');
} else {
  fail('Zod validation not found');
}

if (serverContent.includes('Schemas')) {
  pass('Validation schemas defined');
} else {
  warn('Validation schemas may be missing');
}

if (serverContent.includes('sanitize')) {
  pass('Input sanitization function exists');
} else {
  fail('Input sanitization not found');
}

if (serverContent.includes('.safeParse(')) {
  pass('Safe parsing used for validation');
} else {
  warn('Safe parsing may not be used consistently');
}

// 10. Database Security
log('\n10. Database Security', 'blue');

if (serverContent.includes('.prepare(')) {
  pass('Prepared statements used (SQL injection prevention)');
} else {
  fail('Prepared statements not found');
}

if (serverContent.includes('better-sqlite3')) {
  pass('SQLite with prepared statements');
} else {
  warn('Database library unclear');
}

// Summary
log('\n' + '='.repeat(60), 'bold');
log('Audit Summary', 'bold');
log('='.repeat(60), 'bold');

log(`\n✓ Passed: ${results.passed.length}`, 'green');
log(`⚠ Warnings: ${results.warnings.length}`, 'yellow');
log(`✗ Failed: ${results.failed.length}`, 'red');

if (results.warnings.length > 0) {
  log('\nWarnings:', 'yellow');
  results.warnings.forEach((w) => {
    log(`  • ${w.check}`, 'yellow');
    if (w.details) {
      log(`    ${w.details}`, 'yellow');
    }
  });
}

if (results.failed.length > 0) {
  log('\nFailed Checks:', 'red');
  results.failed.forEach((f) => {
    log(`  • ${f.check}`, 'red');
    if (f.details) {
      log(`    ${f.details}`, 'red');
    }
  });
}

log('\n' + '='.repeat(60) + '\n', 'bold');

// Exit with error code if there are failures
if (results.failed.length > 0) {
  log('Security audit FAILED. Please address the issues above.', 'red');
  process.exit(1);
} else if (results.warnings.length > 0) {
  log('Security audit PASSED with warnings.', 'yellow');
  process.exit(0);
} else {
  log('Security audit PASSED. All checks successful!', 'green');
  process.exit(0);
}
