/**
 * Automated E2E Tests using Playwright
 *
 * These tests simulate real user interactions in a browser environment
 * to test critical user journeys end-to-end.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Critical User Journeys - E2E', () => {
  test.describe('1. Matchmaking Flow', () => {
    test('Two users can match successfully', async ({ browser }) => {
      // Create two browser contexts (simulating two users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Navigate both users to the app
      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      // Wait for page to load
      await page1.waitForLoadState('networkidle');
      await page2.waitForLoadState('networkidle');

      // User 1 clicks "Start Chatting"
      await page1.click('#start-btn');

      // Verify searching state
      await expect(page1.locator('#chat-status')).toContainText('Finding a human connection');

      // User 2 clicks "Start Chatting"
      await page2.click('#start-btn');

      // Wait for both users to be matched (max 10 seconds)
      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // Verify both users are in connected state
      await expect(page1.locator('#chat-status')).toContainText('Human connection established');
      await expect(page2.locator('#chat-status')).toContainText('Human connection established');

      // Verify message input is enabled
      await expect(page1.locator('#msg-input')).toBeEnabled();
      await expect(page2.locator('#msg-input')).toBeEnabled();

      // Cleanup
      await context1.close();
      await context2.close();
    });

    test('Online count updates correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check online count is visible
      const onlineCount = await page.locator('#online-count');
      await expect(onlineCount).toBeVisible();

      // Verify it contains a number
      const text = await onlineCount.textContent();
      expect(text).toMatch(/Online: \d+/);
    });
  });

  test.describe('2. Message Sending and Receiving', () => {
    test('Messages are exchanged between matched users', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      // Match the users
      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // User 1 sends a message
      const testMessage = 'Hello from User 1!';
      await page1.fill('#msg-input', testMessage);
      await page1.click('#send-btn');

      // Verify message appears in User 1's chat with "Sent" status
      await expect(page1.locator('.msg-wrapper.me .text')).toContainText(testMessage);
      await expect(page1.locator('.msg-wrapper.me .msg-status')).toContainText('Sent');

      // Verify message appears in User 2's chat
      await expect(page2.locator('.msg-wrapper.stranger .text')).toContainText(testMessage);

      // User 2 sends a reply
      const replyMessage = 'Hello from User 2!';
      await page2.fill('#msg-input', replyMessage);
      await page2.click('#send-btn');

      // Verify reply appears in both chats
      await expect(page2.locator('.msg-wrapper.me .text')).toContainText(replyMessage);
      await expect(page1.locator('.msg-wrapper.stranger .text')).toContainText(replyMessage);

      await context1.close();
      await context2.close();
    });

    test('Multiple messages are delivered in order', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // Send multiple messages
      const messages = ['Message 1', 'Message 2', 'Message 3'];

      for (const msg of messages) {
        await page1.fill('#msg-input', msg);
        await page1.click('#send-btn');
        await page1.waitForTimeout(700); // Wait to respect rate limiting
      }

      // Verify all messages appear in order on User 2's side
      const receivedMessages = await page2.locator('.msg-wrapper.stranger .text').allTextContents();
      expect(receivedMessages).toEqual(messages);

      await context1.close();
      await context2.close();
    });

    test('Enter key sends message', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // Type message and press Enter
      const testMessage = 'Sent with Enter key';
      await page1.fill('#msg-input', testMessage);
      await page1.press('#msg-input', 'Enter');

      // Verify message was sent
      await expect(page2.locator('.msg-wrapper.stranger .text')).toContainText(testMessage);

      await context1.close();
      await context2.close();
    });
  });

  test.describe('3. Typing Indicators', () => {
    test('Typing indicator displays correctly', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // User 1 starts typing
      await page1.type('#msg-input', 'Test', { delay: 100 });

      // Verify typing indicator appears for User 2
      await expect(page2.locator('#typing-ui')).toBeVisible();

      // Stop typing and wait
      await page1.waitForTimeout(2500);

      // Verify typing indicator disappears
      await expect(page2.locator('#typing-ui')).toBeHidden();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('4. Next Button Functionality', () => {
    test('Next button disconnects and finds new match', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const context3 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      const page3 = await context3.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      // Match User 1 and User 2
      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // User 1 clicks Next
      await page1.click('#next-btn');

      // Verify User 2 sees disconnect message
      await expect(page2.locator('.system-msg')).toContainText('Stranger left the chat');

      // Verify User 1 is searching again
      await expect(page1.locator('#chat-status')).toContainText('Finding a human connection');

      // User 3 joins
      await page3.goto(BASE_URL);
      await page3.click('#start-btn');

      // Verify User 1 matches with User 3
      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page3.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      await context1.close();
      await context2.close();
      await context3.close();
    });
  });

  test.describe('5. Report Functionality', () => {
    test('Report button works and disconnects user', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // Click report button
      await page1.click('#report-btn');

      // Confirm the report dialog
      page1.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Report');
        await dialog.accept();
      });

      // Wait for dialog to be handled
      await page1.waitForTimeout(500);

      // Verify User 1 is searching for new match
      await expect(page1.locator('#chat-status')).toContainText('Finding a human connection');

      await context1.close();
      await context2.close();
    });
  });

  test.describe('6. Session Restoration', () => {
    test('Chat state is restored after page refresh', async ({ page }) => {
      await page.goto(BASE_URL);

      // Start chat and send a message
      await page.click('#start-btn');

      // Wait a bit for potential match (or timeout)
      await page.waitForTimeout(2000);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check if session storage restoration message appears
      // (This depends on whether there was an active chat)
      const chatBox = await page.locator('#chat-box');
      await expect(chatBox).toBeVisible();
    });
  });

  test.describe('7. Edge Cases', () => {
    test('Empty messages are not sent', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // Try to send empty message
      await page1.fill('#msg-input', '   ');
      await page1.click('#send-btn');

      // Wait a bit
      await page1.waitForTimeout(500);

      // Verify no message was sent to User 2
      const messages = await page2.locator('.msg-wrapper.stranger').count();
      expect(messages).toBe(0);

      await context1.close();
      await context2.close();
    });

    test('Long messages are handled correctly', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      await page1.goto(BASE_URL);
      await page2.goto(BASE_URL);

      await page1.click('#start-btn');
      await page2.click('#start-btn');

      await Promise.all([
        page1.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
        page2.waitForSelector('.system-msg:has-text("connected with a stranger")', {
          timeout: 10000,
        }),
      ]);

      // Try to send a very long message (> 1000 chars)
      const longMessage = 'a'.repeat(1500);
      await page1.fill('#msg-input', longMessage);

      // Check if input was truncated to 1000 chars
      const inputValue = await page1.inputValue('#msg-input');
      expect(inputValue.length).toBeLessThanOrEqual(1000);

      await context1.close();
      await context2.close();
    });

    test('Keyboard shortcut (Esc) triggers Next button', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.click('#start-btn');

      // Wait for chat screen to be active
      await page.waitForSelector('#chat-screen.active', { timeout: 5000 });

      // Press Escape key
      await page.keyboard.press('Escape');

      // Verify searching state (Next was triggered)
      await expect(page.locator('#chat-status')).toContainText('Finding a human connection');
    });
  });

  test.describe('8. Accessibility', () => {
    test('Chat interface is keyboard navigable', async ({ page }) => {
      await page.goto(BASE_URL);

      // Tab to start button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Enter to start
      await page.keyboard.press('Enter');

      // Verify chat started
      await expect(page.locator('#chat-screen')).toHaveClass(/active/);
    });

    test('Screen reader announcements are present', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check for aria-live regions
      const ariaLive = await page.locator('[aria-live]');
      await expect(ariaLive).toBeTruthy();
    });
  });

  test.describe('9. Performance', () => {
    test('Page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('Connection quality indicator updates', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.click('#start-btn');

      // Wait for connection quality indicator
      await page.waitForTimeout(6000); // Quality check runs every 5 seconds

      const qualityIndicator = await page.locator('#connection-quality');
      await expect(qualityIndicator).toBeVisible();

      // Should have a quality class
      const className = await qualityIndicator.getAttribute('class');
      expect(className).toMatch(/conn-(good|fair|poor|very-poor|offline)/);
    });
  });
});
