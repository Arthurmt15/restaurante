import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#login-email', 'admin@restaurante.com');
    await page.fill('#login-senha', 'admin123');
    await page.click('#login-submit-btn');

    await expect(page).toHaveURL(/\/(comandas|admin)/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#login-email', 'invalid@email.com');
    await page.fill('#login-senha', 'wrongpassword');
    await page.click('#login-submit-btn');

    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText(/inválid|erro/i);
  });

  test('accessing protected page without auth redirects to login', async ({ page }) => {
    await page.goto('/comandas');

    await expect(page).toHaveURL(/\/login/);
  });
});
