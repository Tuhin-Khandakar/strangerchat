// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Strngr Chat Flow', () => {
  test('Two users can match and chat', async ({ browser }) => {
    // Create two isolated browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 1. Landing Page
    await page1.goto('/');
    await expect(page1).toHaveTitle(/STRNGR/);
    await expect(page1.locator('#landing-screen')).toHaveClass(/active/);

    await page2.goto('/');

    // 2. Accept TOS and Start
    await page1.locator('#tos-check').check();
    await page1.locator('#start-btn').click();
    await expect(page1.locator('#chat-screen')).toHaveClass(/active/);
    await expect(page1.locator('#chat-status')).toContainText('Looking');

    await page2.locator('#tos-check').check();
    await page2.locator('#start-btn').click();

    // 3. Matchmaking (wait for connected)
    // The text changes to "You're connected."
    await expect(page1.locator('#chat-status')).toContainText("You're connected", {
      timeout: 15000,
    });
    await expect(page2.locator('#chat-status')).toContainText("You're connected", {
      timeout: 15000,
    });

    // 4. Send Message
    const msg1 = 'Hello from User 1';
    await page1.locator('#msg-input').fill(msg1);
    await page1.locator('#send-btn').click();

    // Check User 2 received it
    await expect(page2.locator('.msg.stranger .text')).toContainText(msg1);

    // 5. Reply
    const msg2 = 'Hi User 1!';
    await page2.locator('#msg-input').fill(msg2);
    await page2.keyboard.press('Enter');

    // Check User 1 received it
    await expect(page1.locator('.msg.stranger .text')).toContainText(msg2);

    // 6. Next / Disconnect
    await page1.locator('#next-btn').click();
    await expect(page1.locator('#chat-status')).toContainText('Looking');

    // User 2 should see "Stranger left"
    await expect(page2.locator('#chat-status')).toContainText('Stranger left');

    await context1.close();
    await context2.close();
  });
});
