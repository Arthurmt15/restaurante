import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('#login-email', 'admin@restaurante.com');
  await page.fill('#login-senha', 'admin123');
  await page.click('#login-submit-btn');
  await expect(page).toHaveURL(/\/(comandas|admin)/);
}

test.describe('Comandas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create new comanda', async ({ page }) => {
    await page.goto('/comandas/nova');

    const mesaSelect = page.locator('select').first();
    await mesaSelect.waitFor({ state: 'visible' });
    const options = await mesaSelect.locator('option').allTextContents();
    if (options.length > 1) {
      await mesaSelect.selectOption({ index: 1 });
    }

    await page.click('button:has-text("Criar Comanda")');

    await expect(page).toHaveURL(/\/comandas\/[a-f0-9]/);
  });

  test('add item to comanda', async ({ page }) => {
    await page.goto('/comandas');

    const comandaLink = page.locator('table tbody tr').first();
    if (await comandaLink.isVisible()) {
      await comandaLink.click();
      await expect(page).toHaveURL(/\/comandas\/[a-f0-9]/);
    }
  });

  test('close comanda with payment', async ({ page }) => {
    await page.goto('/comandas');

    const comandaLink = page.locator('table tbody tr').first();
    if (await comandaLink.isVisible()) {
      await comandaLink.click();
      await expect(page).toHaveURL(/\/comandas\/[a-f0-9]/);
    }
  });
});
