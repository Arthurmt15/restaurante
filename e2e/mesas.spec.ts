import { test, expect } from '@playwright/test';

test.describe('Mesas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'admin@restaurante.com');
    await page.fill('#login-senha', 'admin123');
    await page.click('#login-submit-btn');
    await page.waitForURL(/\/(comandas|admin)/);
    await page.goto('/mesas');
    await page.waitForLoadState('networkidle');
  });

  test('page loads and shows mesas list', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Mesas');
    await expect(page.locator('.card-grid, table')).toBeVisible();
  });

  test('can switch between list and map view', async ({ page }) => {
    const listaBtn = page.locator('button:has-text("Lista")');
    const mapaBtn = page.locator('button:has-text("Mapa")');

    await expect(listaBtn).toBeVisible();
    await expect(mapaBtn).toBeVisible();

    await mapaBtn.click();
    await expect(page.locator('.mesa-map-grid, .mesa-map-container')).toBeVisible();

    await listaBtn.click();
    await expect(page.locator('.card-grid')).toBeVisible();
  });

  test('can add a new mesa', async ({ page }) => {
    const input = page.locator('input[placeholder="Número"]');
    await input.fill('99');
    await page.click('button:has-text("Adicionar")');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Mesa 99')).toBeVisible();
  });

  test('shows error for duplicate mesa number', async ({ page }) => {
    const input = page.locator('input[placeholder="Número"]');
    await input.fill('1');
    await page.click('button:has-text("Adicionar")');
    await page.waitForLoadState('networkidle');

    const error = page.locator('.form-error, .error-message, [role="alert"]');
    await expect(error).toBeVisible();
  });
});
