import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('#login-email', 'admin@restaurante.com');
  await page.fill('#login-senha', 'admin123');
  await page.click('#login-submit-btn');
  await expect(page).toHaveURL(/\/(comandas|admin)/);
}

test.describe('Cardápio', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('create category', async ({ page }) => {
    await page.goto('/cardapio');

    const categoryInput = page.locator('input[placeholder*="Bebidas"]');
    await categoryInput.fill('E2E Test Category');

    await page.click('button:has-text("Criar Categoria")');

    await expect(page.locator('h3:has-text("E2E Test Category")')).toBeVisible();
  });

  test('create menu item', async ({ page }) => {
    await page.goto('/cardapio');

    await page.locator('input[placeholder*="Cerveja"]').fill('E2E Test Item');
    await page.locator('input[type="number"]').first().fill('25.90');

    const categorySelect = page.locator('select').last();
    const options = await categorySelect.locator('option').allTextContents();
    if (options.length > 1) {
      await categorySelect.selectOption({ index: 1 });
    }

    await page.click('button:has-text("Adicionar Item")');

    await expect(page.locator('td:has-text("E2E Test Item")')).toBeVisible();
  });

  test('edit menu item price', async ({ page }) => {
    await page.goto('/cardapio');

    const editButton = page.locator('button:has-text("Editar")').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      const priceInput = page.locator('table input[type="number"]').first();
      await priceInput.fill('99.99');

      await page.click('button:has-text("Salvar")');

      await expect(page.locator('td:has-text("R$ 99.99")')).toBeVisible();
    }
  });
});
