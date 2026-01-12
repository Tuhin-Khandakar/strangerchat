#!/usr/bin/env node

/**
 * PWA Testing Helper Script
 * Automates common PWA testing tasks and validations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

class PWATester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
  }

  /**
   * Run all PWA validation tests
   */
  async runAll() {
    log.header('🔍 PWA Testing Suite');

    await this.validateServiceWorker();
    await this.validateManifest();
    await this.validateOfflinePage();
    await this.validateIcons();
    await this.validateMetaTags();
    await this.validateCacheStrategy();

    this.printSummary();
  }

  /**
   * Validate service worker file
   */
  async validateServiceWorker() {
    log.header('Service Worker Validation');

    const swPath = path.join(__dirname, '../public/sw.js');

    // Check if file exists
    if (!fs.existsSync(swPath)) {
      this.recordTest('Service Worker File', false, 'sw.js not found');
      return;
    }
    this.recordTest('Service Worker File', true);

    // Read and validate content
    const swContent = fs.readFileSync(swPath, 'utf8');

    // Check for required event listeners
    const requiredListeners = [
      { name: 'install', pattern: /addEventListener\s*\(\s*['"]install['"]/ },
      { name: 'activate', pattern: /addEventListener\s*\(\s*['"]activate['"]/ },
      { name: 'fetch', pattern: /addEventListener\s*\(\s*['"]fetch['"]/ },
      { name: 'push', pattern: /addEventListener\s*\(\s*['"]push['"]/ },
      { name: 'sync', pattern: /addEventListener\s*\(\s*['"]sync['"]/ },
      { name: 'message', pattern: /addEventListener\s*\(\s*['"]message['"]/ },
    ];

    for (const listener of requiredListeners) {
      const found = listener.pattern.test(swContent);
      this.recordTest(
        `SW Event: ${listener.name}`,
        found,
        found ? null : `${listener.name} event listener not found`
      );
    }

    // Check for cache versioning
    const hasCacheVersion = /CACHE_VERSION|BUILD_HASH/.test(swContent);
    this.recordTest(
      'Cache Versioning',
      hasCacheVersion,
      hasCacheVersion ? null : 'No cache versioning found'
    );

    // Check for offline fallback
    const hasOfflineFallback = /offline\.html/.test(swContent);
    this.recordTest(
      'Offline Fallback',
      hasOfflineFallback,
      hasOfflineFallback ? null : 'No offline.html fallback'
    );

    // Check for cache eviction
    const hasCacheEviction = /smartCacheEviction|CACHE_LIMITS/.test(swContent);
    this.recordTest(
      'Cache Eviction',
      hasCacheEviction,
      hasCacheEviction ? null : 'No cache size management',
      'warning'
    );

    // Check for skipWaiting
    const hasSkipWaiting = /skipWaiting/.test(swContent);
    this.recordTest(
      'Skip Waiting',
      hasSkipWaiting,
      hasSkipWaiting ? null : 'No skipWaiting call',
      'warning'
    );

    // Check for clients.claim
    const hasClientsClaim = /clients\.claim/.test(swContent);
    this.recordTest(
      'Clients Claim',
      hasClientsClaim,
      hasClientsClaim ? null : 'No clients.claim call',
      'warning'
    );
  }

  /**
   * Validate manifest.json
   */
  async validateManifest() {
    log.header('Manifest.json Validation');

    const manifestPath = path.join(__dirname, '../public/manifest.json');

    // Check if file exists
    if (!fs.existsSync(manifestPath)) {
      this.recordTest('Manifest File', false, 'manifest.json not found');
      return;
    }
    this.recordTest('Manifest File', true);

    // Parse and validate
    let manifest;
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent);
      this.recordTest('Manifest Valid JSON', true);
    } catch (err) {
      this.recordTest('Manifest Valid JSON', false, `Invalid JSON: ${err.message}`);
      return;
    }

    // Check required fields
    const requiredFields = [
      { name: 'name', type: 'string' },
      { name: 'short_name', type: 'string' },
      { name: 'start_url', type: 'string' },
      { name: 'display', type: 'string' },
      { name: 'theme_color', type: 'string' },
      { name: 'background_color', type: 'string' },
      { name: 'icons', type: 'array' },
    ];

    for (const field of requiredFields) {
      const exists = field.name in manifest;
      const correctType =
        exists &&
        (field.type === 'array'
          ? Array.isArray(manifest[field.name])
          : typeof manifest[field.name] === field.type);

      this.recordTest(
        `Manifest: ${field.name}`,
        exists && correctType,
        exists ? (correctType ? null : `Wrong type (expected ${field.type})`) : 'Field missing'
      );
    }

    // Validate display mode
    const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    const hasValidDisplay = validDisplayModes.includes(manifest.display);
    this.recordTest(
      'Display Mode',
      hasValidDisplay,
      hasValidDisplay ? null : `Invalid display mode: ${manifest.display}`
    );

    // Validate colors
    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
    const validThemeColor = hexColorPattern.test(manifest.theme_color);
    const validBgColor = hexColorPattern.test(manifest.background_color);

    this.recordTest('Theme Color', validThemeColor, validThemeColor ? null : 'Invalid hex color');
    this.recordTest('Background Color', validBgColor, validBgColor ? null : 'Invalid hex color');

    // Validate icons
    if (Array.isArray(manifest.icons)) {
      const has192Icon = manifest.icons.some(
        (icon) => icon.sizes && icon.sizes.includes('192x192')
      );
      const has512Icon = manifest.icons.some(
        (icon) => icon.sizes && icon.sizes.includes('512x512')
      );

      this.recordTest('Icon 192x192', has192Icon, has192Icon ? null : 'Missing 192x192 icon');
      this.recordTest('Icon 512x512', has512Icon, has512Icon ? null : 'Missing 512x512 icon');

      // Check icon files exist
      for (const icon of manifest.icons) {
        const iconPath = path.join(__dirname, '../public', icon.src);
        const exists = fs.existsSync(iconPath);
        this.recordTest(
          `Icon File: ${icon.src}`,
          exists,
          exists ? null : `Icon file not found: ${icon.src}`,
          exists ? 'success' : 'warning'
        );
      }
    }

    // Check for shortcuts
    if (manifest.shortcuts && Array.isArray(manifest.shortcuts)) {
      log.info(`Found ${manifest.shortcuts.length} app shortcuts`);
      for (const shortcut of manifest.shortcuts) {
        const hasName = !!shortcut.name;
        const hasUrl = !!shortcut.url;
        this.recordTest(
          `Shortcut: ${shortcut.name || 'unnamed'}`,
          hasName && hasUrl,
          hasName && hasUrl ? null : 'Missing name or url',
          'warning'
        );
      }
    } else {
      this.recordTest('App Shortcuts', false, 'No shortcuts defined', 'warning');
    }
  }

  /**
   * Validate offline page
   */
  async validateOfflinePage() {
    log.header('Offline Page Validation');

    const offlinePath = path.join(__dirname, '../src/client/offline.html');

    // Check if file exists
    if (!fs.existsSync(offlinePath)) {
      this.recordTest('Offline Page File', false, 'offline.html not found');
      return;
    }
    this.recordTest('Offline Page File', true);

    // Read and validate content
    const offlineContent = fs.readFileSync(offlinePath, 'utf8');

    // Check for required elements
    const hasTitle = /<title>/.test(offlineContent);
    const hasHeading = /<h1>/.test(offlineContent);
    const hasReconnectButton = /reconnect|reload/i.test(offlineContent);

    this.recordTest('Offline: Title', hasTitle, hasTitle ? null : 'No title tag');
    this.recordTest('Offline: Heading', hasHeading, hasHeading ? null : 'No h1 heading');
    this.recordTest(
      'Offline: Reconnect Button',
      hasReconnectButton,
      hasReconnectButton ? null : 'No reconnect button'
    );

    // Check for viewport meta
    const hasViewport = /<meta\s+name=["']viewport["']/.test(offlineContent);
    this.recordTest(
      'Offline: Viewport',
      hasViewport,
      hasViewport ? null : 'No viewport meta tag',
      'warning'
    );
  }

  /**
   * Validate icon files
   */
  async validateIcons() {
    log.header('Icon Files Validation');

    const publicDir = path.join(__dirname, '../public');
    const iconsDir = path.join(publicDir, 'icons');

    // Check for logo files
    const logoFiles = ['logo.png', 'logo.webp', 'logo_dark.png', 'logo_dark.webp'];

    for (const logo of logoFiles) {
      const logoPath = path.join(publicDir, logo);
      const exists = fs.existsSync(logoPath);
      this.recordTest(
        `Logo: ${logo}`,
        exists,
        exists ? null : `${logo} not found`,
        exists ? 'success' : 'warning'
      );
    }

    // Check for icon directory
    if (!fs.existsSync(iconsDir)) {
      this.recordTest('Icons Directory', false, 'icons/ directory not found');
      return;
    }
    this.recordTest('Icons Directory', true);

    // Check for common SVG icons
    const requiredIcons = ['user.svg', 'lock.svg', 'shield.svg', 'smartphone.svg', 'check.svg'];

    for (const icon of requiredIcons) {
      const iconPath = path.join(iconsDir, icon);
      const exists = fs.existsSync(iconPath);
      this.recordTest(
        `Icon: ${icon}`,
        exists,
        exists ? null : `${icon} not found`,
        exists ? 'success' : 'warning'
      );
    }
  }

  /**
   * Validate HTML meta tags
   */
  async validateMetaTags() {
    log.header('HTML Meta Tags Validation');

    const indexPath = path.join(__dirname, '../src/client/index.html');

    if (!fs.existsSync(indexPath)) {
      this.recordTest('Index HTML', false, 'index.html not found');
      return;
    }
    this.recordTest('Index HTML', true);

    const htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Check for PWA meta tags
    const metaTags = [
      { name: 'viewport', pattern: /<meta\s+name=["']viewport["']/ },
      { name: 'theme-color', pattern: /<meta\s+name=["']theme-color["']/ },
      { name: 'description', pattern: /<meta\s+name=["']description["']/ },
      { name: 'manifest link', pattern: /<link\s+rel=["']manifest["']/ },
      { name: 'apple-touch-icon', pattern: /<link\s+rel=["']apple-touch-icon["']/ },
    ];

    for (const tag of metaTags) {
      const found = tag.pattern.test(htmlContent);
      this.recordTest(
        `Meta: ${tag.name}`,
        found,
        found ? null : `${tag.name} not found`,
        tag.name === 'apple-touch-icon' ? 'warning' : 'error'
      );
    }

    // Check for nonce in scripts (CSP)
    const hasNonce = /nonce=["']__NONCE__["']/.test(htmlContent);
    this.recordTest(
      'CSP Nonce',
      hasNonce,
      hasNonce ? null : 'No nonce attribute for CSP',
      'warning'
    );
  }

  /**
   * Validate caching strategy
   */
  async validateCacheStrategy() {
    log.header('Cache Strategy Validation');

    const swPath = path.join(__dirname, '../public/sw.js');
    if (!fs.existsSync(swPath)) {
      this.recordTest('Service Worker', false, 'Cannot validate cache strategy without sw.js');
      return;
    }

    const swContent = fs.readFileSync(swPath, 'utf8');

    // Check for different caching strategies
    const strategies = [
      { name: 'Cache First', pattern: /caches\.match.*fetch/ },
      { name: 'Network First', pattern: /fetch.*caches\.match/ },
      { name: 'Stale While Revalidate', pattern: /stale.*revalidate|response.*fetchPromise/i },
    ];

    for (const strategy of strategies) {
      const found = strategy.pattern.test(swContent);
      this.recordTest(
        `Strategy: ${strategy.name}`,
        found,
        found ? null : `${strategy.name} not implemented`,
        'warning'
      );
    }

    // Check for cache cleanup
    const hasCacheCleanup = /caches\.delete|caches\.keys/.test(swContent);
    this.recordTest(
      'Cache Cleanup',
      hasCacheCleanup,
      hasCacheCleanup ? null : 'No cache cleanup logic',
      'warning'
    );

    // Check for cache limits
    const hasCacheLimits = /maxItems|maxSize|CACHE_LIMITS/.test(swContent);
    this.recordTest(
      'Cache Limits',
      hasCacheLimits,
      hasCacheLimits ? null : 'No cache size limits',
      'warning'
    );
  }

  /**
   * Record test result
   */
  recordTest(name, passed, message = null, level = 'error') {
    const result = {
      name,
      passed,
      message,
      level,
    };

    this.results.tests.push(result);

    if (passed) {
      this.results.passed++;
      log.success(name);
    } else {
      if (level === 'warning') {
        this.results.warnings++;
        log.warn(`${name}${message ? `: ${message}` : ''}`);
      } else {
        this.results.failed++;
        log.error(`${name}${message ? `: ${message}` : ''}`);
      }
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    log.header('Test Summary');

    const total = this.results.passed + this.results.failed + this.results.warnings;
    const passRate = ((this.results.passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${this.results.warnings}${colors.reset}`);
    console.log(`\nPass Rate: ${passRate}%`);

    if (this.results.failed === 0) {
      log.success('\n🎉 All critical tests passed!');
    } else {
      log.error(`\n❌ ${this.results.failed} critical test(s) failed`);
      process.exit(1);
    }
  }
}

// Run tests
const tester = new PWATester();
tester.runAll().catch((err) => {
  log.error(`Test suite failed: ${err.message}`);
  process.exit(1);
});
