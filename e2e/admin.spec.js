import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Go to admin page
    await page.goto('/admin.html');
  });

  test('should show login overlay', async ({ page }) => {
    const overlay = page.locator('#auth-overlay');
    await expect(overlay).toBeVisible();
  });

  test('should allow login with correct password', async ({ page }) => {
    // We assume ADMIN_PASSWORD is set in environment for the test runner
    const password = process.env.ADMIN_PASSWORD || 'strong-secret';

    await page.fill('#auth-token', password);
    await page.click('button:has-text("Login")');

    const overlay = page.locator('#auth-overlay');
    await expect(overlay).not.toBeVisible();
  });

  test('should show error on wrong password', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Invalid Password');
      await dialog.dismiss();
    });

    await page.fill('#auth-token', 'wrong-pass');
    await page.click('button:has-text("Login")');
  });

  test('should switch tabs correctly', async ({ page }) => {
    // Login first
    const password = process.env.ADMIN_PASSWORD || 'strong-secret';
    await page.fill('#auth-token', password);
    await page.click('button:has-text("Login")');

    await page.click('div.tab:has-text("Violations")');
    const violationsSection = page.locator('#sec-violations');
    await expect(violationsSection).toBeVisible();

    await page.click('div.tab:has-text("Bans")');
    const bansSection = page.locator('#sec-bans');
    await expect(bansSection).toBeVisible();
  });
});
