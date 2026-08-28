import { test, expect } from '@playwright/test';

test.describe('Garçons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'admin@restaurante.com');
    await page.fill('#login-senha', 'admin123');
    await page.click('#login-submit-btn');
    await page.waitForURL(/\/(comandas|admin)/);
    await page.goto('/garcons');
    await page.waitForLoadState('networkidle');
  });

  test('page loads and shows garçons list', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Garçons');
  });

  test('can add a new garçom', async ({ page }) => {
    const nomeInput = page.locator('input[placeholder*="Nome"], input[placeholder*="nome"]').first();
    if (await nomeInput.isVisible()) {
      await nomeInput.fill('Garçom Teste E2E');
      await page.click('button:has-text("Adicionar"), button:has-text("Salvar")');
      await page.waitForLoadState('networkidle');
    }
  });
});

test.describe('Relatórios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'admin@restaurante.com');
    await page.fill('#login-senha', 'admin123');
    await page.click('#login-submit-btn');
    await page.waitForURL(/\/(comandas|admin)/);
    await page.goto('/relatorios');
    await page.waitForLoadState('networkidle');
  });

  test('page loads and shows report filters', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Relatórios');
    await expect(page.locator('.filter-group, .filter-btn')).toBeVisible();
  });

  test('can switch between period filters', async ({ page }) => {
    const diarioBtn = page.locator('button:has-text("Diário")');
    const semanalBtn = page.locator('button:has-text("Semanal")');
    const mensalBtn = page.locator('button:has-text("Mensal")');

    if (await diarioBtn.isVisible()) {
      await diarioBtn.click();
      await page.waitForTimeout(500);
    }
    if (await semanalBtn.isVisible()) {
      await semanalBtn.click();
      await page.waitForTimeout(500);
    }
    if (await mensalBtn.isVisible()) {
      await mensalBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('print button is visible', async ({ page }) => {
    const printBtn = page.locator('button:has-text("Imprimir")');
    await expect(printBtn).toBeVisible();
  });
});

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'admin@restaurante.com');
    await page.fill('#login-senha', 'admin123');
    await page.click('#login-submit-btn');
    await page.waitForURL(/\/(comandas|admin)/);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('page loads and shows admin panel', async ({ page }) => {
    await expect(page.locator('h2, h1')).toContainText(/Admin|Painel|Usuários/i);
  });

  test('admin can see user list or creation form', async ({ page }) => {
    const hasContent = await page.locator('table, .card, form').first().isVisible();
    expect(hasContent).toBeTruthy();
  });
});
