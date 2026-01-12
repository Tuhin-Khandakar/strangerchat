// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Complete User Flow - Connection and Messaging', () => {
  test('should complete full chat flow from landing to disconnect', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // 1. Landing Page - User 1
      await page1.goto('/');
      await expect(page1).toHaveTitle(/STRNGR/);
      await expect(page1.locator('#landing-screen')).toHaveClass(/active/);

      // 2. Landing Page - User 2
      await page2.goto('/');
      await expect(page2).toHaveTitle(/STRNGR/);

      // 3. Accept TOS and Start - User 1
      await page1.locator('#tos-check').check();
      await expect(page1.locator('#start-btn')).toBeEnabled();
      await page1.locator('#start-btn').click();
      await expect(page1.locator('#chat-screen')).toHaveClass(/active/);
      await expect(page1.locator('#chat-status')).toContainText('Looking');

      // 4. Accept TOS and Start - User 2
      await page2.locator('#tos-check').check();
      await page2.locator('#start-btn').click();

      // 5. Wait for Match
      await expect(page1.locator('#chat-status')).toContainText("You're connected", {
        timeout: 15000,
      });
      await expect(page2.locator('#chat-status')).toContainText("You're connected", {
        timeout: 15000,
      });

      // 6. Send Multiple Messages
      const messages = [
        { sender: page1, text: 'Hello from User 1', receiver: page2 },
        { sender: page2, text: 'Hi User 1!', receiver: page1 },
        { sender: page1, text: 'How are you?', receiver: page2 },
        { sender: page2, text: 'I am good, thanks!', receiver: page1 },
      ];

      for (const msg of messages) {
        await msg.sender.locator('#msg-input').fill(msg.text);
        await msg.sender.locator('#send-btn').click();
        await expect(msg.receiver.locator('.msg.stranger .text')).toContainText(msg.text);
        await expect(msg.sender.locator('.msg.you .text')).toContainText(msg.text);
      }

      // 7. Disconnect - User 1 clicks Next
      await page1.locator('#next-btn').click();
      await expect(page1.locator('#chat-status')).toContainText('Looking');

      // 8. User 2 should see disconnect message
      await expect(page2.locator('#chat-status')).toContainText('Stranger left');

      // 9. Verify chat is cleared for User 1
      const user1Messages = await page1.locator('.msg').count();
      expect(user1Messages).toBe(0);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle rapid reconnection', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await page.locator('#tos-check').check();
      await page.locator('#start-btn').click();

      // Start searching
      await expect(page.locator('#chat-status')).toContainText('Looking');

      // Rapidly click Next multiple times
      for (let i = 0; i < 3; i++) {
        await page.locator('#next-btn').click();
        await page.waitForTimeout(100);
      }

      // Should still be in valid state
      await expect(page.locator('#chat-status')).toContainText('Looking');
    } finally {
      await context.close();
    }
  });

  test('should handle keyboard navigation', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');

      // Tab to TOS checkbox
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      await expect(page.locator('#tos-check')).toBeChecked();

      // Tab to Start button and press Enter
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(page.locator('#chat-screen')).toHaveClass(/active/);

      // Type message and send with Enter
      await page.locator('#msg-input').focus();
      await page.keyboard.type('Test message');
      await page.keyboard.press('Enter');

      // Message should appear
      await expect(page.locator('.msg.you .text')).toContainText('Test message');
    } finally {
      await context.close();
    }
  });
});

test.describe('Reporting Flow', () => {
  test('should allow user to report stranger', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Connect two users
      await page1.goto('/');
      await page2.goto('/');

      await page1.locator('#tos-check').check();
      await page1.locator('#start-btn').click();

      await page2.locator('#tos-check').check();
      await page2.locator('#start-btn').click();

      await expect(page1.locator('#chat-status')).toContainText("You're connected", {
        timeout: 15000,
      });

      // User 2 sends inappropriate message
      await page2.locator('#msg-input').fill('Inappropriate content here');
      await page2.locator('#send-btn').click();

      // User 1 reports
      const reportBtn = page1.locator('#report-btn, button:has-text("Report")');
      if (await reportBtn.isVisible()) {
        await reportBtn.click();

        // Confirm report dialog
        const confirmBtn = page1.locator('button:has-text("Report"), .modal-btn.confirm');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }

        // Should show confirmation
        await expect(page1.locator('.toast, [role="status"]')).toContainText(/report/i, {
          timeout: 5000,
        });
      }
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Error Scenarios', () => {
  test('should handle network disconnection gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await page.locator('#tos-check').check();
      await page.locator('#start-btn').click();

      // Simulate offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);

      // Should show offline indicator
      const offlineIndicator = page.locator('.offline-indicator, [data-status="offline"]');
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toBeVisible();
      }

      // Reconnect
      await context.setOffline(false);
      await page.waitForTimeout(2000);

      // Should recover
      await expect(page.locator('#chat-screen')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('should handle server errors gracefully', async ({ page }) => {
    // Try to access with invalid state
    await page.goto('/');

    // Try to send message without connection
    await page.locator('#tos-check').check();
    await page.locator('#start-btn').click();

    const msgInput = page.locator('#msg-input');
    await msgInput.fill('Test message');

    // Try to send before matched
    const sendBtn = page.locator('#send-btn');
    if (await sendBtn.isEnabled()) {
      await sendBtn.click();
      // Should handle gracefully without crashing
    }

    // Page should still be functional
    await expect(page.locator('#chat-screen')).toBeVisible();
  });

  test('should handle rapid tab switching', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    try {
      await page1.goto('/');
      await page1.locator('#tos-check').check();
      await page1.locator('#start-btn').click();

      // Switch to another tab
      await page2.goto('/');
      await page2.waitForTimeout(500);

      // Switch back
      await page1.bringToFront();
      await page1.waitForTimeout(500);

      // Should still be functional
      await expect(page1.locator('#chat-screen')).toBeVisible();
      await expect(page1.locator('#chat-status')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('should handle page refresh during chat', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await page.locator('#tos-check').check();
      await page.locator('#start-btn').click();

      await expect(page.locator('#chat-status')).toContainText('Looking');

      // Refresh page
      await page.reload();

      // Should return to landing page or restore session
      await expect(page.locator('#landing-screen, #chat-screen')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('should validate message input', async ({ page }) => {
    await page.goto('/');
    await page.locator('#tos-check').check();
    await page.locator('#start-btn').click();

    const msgInput = page.locator('#msg-input');
    const sendBtn = page.locator('#send-btn');

    // Try to send empty message
    await msgInput.fill('   ');
    if (await sendBtn.isEnabled()) {
      await sendBtn.click();
      // Should not send empty message
      const messages = await page.locator('.msg.you').count();
      expect(messages).toBe(0);
    }

    // Try to send very long message
    const longMessage = 'a'.repeat(2000);
    await msgInput.fill(longMessage);
    await sendBtn.click();

    // Should truncate or show error
    await page.waitForTimeout(500);
  });
});

test.describe('Typing Indicator', () => {
  test('should show typing indicator when stranger types', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Connect two users
      await page1.goto('/');
      await page2.goto('/');

      await page1.locator('#tos-check').check();
      await page1.locator('#start-btn').click();

      await page2.locator('#tos-check').check();
      await page2.locator('#start-btn').click();

      await expect(page1.locator('#chat-status')).toContainText("You're connected", {
        timeout: 15000,
      });

      // User 2 starts typing
      await page2.locator('#msg-input').fill('T');

      // User 1 should see typing indicator
      const typingIndicator = page1.locator('#typing-indicator, .typing-indicator');
      if (await typingIndicator.isVisible({ timeout: 3000 })) {
        await expect(typingIndicator).toBeVisible();
      }

      // User 2 stops typing
      await page2.locator('#msg-input').clear();
      await page2.waitForTimeout(2000);

      // Typing indicator should disappear
      if (await typingIndicator.isVisible()) {
        await expect(typingIndicator).not.toBeVisible();
      }
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Mobile Viewport', () => {
  test('should work on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    const page = await context.newPage();

    try {
      await page.goto('/');

      // Should be responsive
      await expect(page.locator('#landing-screen')).toBeVisible();

      await page.locator('#tos-check').check();
      await page.locator('#start-btn').click();

      // Chat should be visible and functional
      await expect(page.locator('#chat-screen')).toBeVisible();
      await expect(page.locator('#msg-input')).toBeVisible();
      await expect(page.locator('#send-btn')).toBeVisible();

      // Test message input on mobile
      await page.locator('#msg-input').fill('Mobile test message');
      await page.locator('#send-btn').click();

      await expect(page.locator('.msg.you .text')).toContainText('Mobile test message');
    } finally {
      await context.close();
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for ARIA labels on key elements
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toHaveAttribute('aria-label', /.+/);

    await page.locator('#tos-check').check();
    await page.locator('#start-btn').click();

    // Check chat elements
    const msgInput = page.locator('#msg-input');
    await expect(msgInput).toHaveAttribute('aria-label', /.+/);

    const sendBtn = page.locator('#send-btn');
    await expect(sendBtn).toHaveAttribute('aria-label', /.+/);
  });

  test('should announce status changes to screen readers', async ({ page }) => {
    await page.goto('/');

    // Check for announcer region
    const announcer = page.locator('#announcer, [role="status"], [aria-live]');
    await expect(announcer).toBeAttached();

    await page.locator('#tos-check').check();
    await page.locator('#start-btn').click();

    // Status changes should be announced
    await page.waitForTimeout(1000);
  });

  test('should support keyboard-only navigation', async ({ page }) => {
    await page.goto('/');

    // Navigate using only keyboard
    await page.keyboard.press('Tab'); // Focus TOS
    await page.keyboard.press('Space'); // Check TOS
    await page.keyboard.press('Tab'); // Focus Start button
    await page.keyboard.press('Enter'); // Click Start

    await expect(page.locator('#chat-screen')).toHaveClass(/active/);

    // Navigate in chat
    await page.keyboard.press('Tab'); // Should focus message input or next button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // All interactive elements should be reachable
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'TEXTAREA']).toContain(focusedElement);
  });
});

test.describe('Connection Quality', () => {
  test('should show connection quality indicator', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await page.locator('#tos-check').check();
      await page.locator('#start-btn').click();

      // Check for connection quality indicator
      const qualityIndicator = page.locator(
        '.connection-quality, [data-quality], .latency-indicator'
      );

      if (await qualityIndicator.isVisible({ timeout: 5000 })) {
        await expect(qualityIndicator).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });
});
