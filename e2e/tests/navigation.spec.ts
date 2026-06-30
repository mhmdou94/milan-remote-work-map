import { test, expect } from '@playwright/test';

test.describe('Page navigation', () => {
  test('switches between Map, Contribute and About pages', async ({ page }) => {
    await page.goto('/');

    const menuNav = page.locator('menu-nav');
    await expect(menuNav).toBeVisible();

    await menuNav.locator('button').filter({ hasText: 'Contribute' }).click();
    await expect(page.locator('.page-content h2').first()).toHaveText('How to Contribute');
    await expect(page.locator('.page-content')).toContainText('Which tags we use');
    await expect(page.locator('.tags-table')).toContainText('laptop=yes');
    await expect(page.locator('.tags-table')).toContainText('internet_access');

    await menuNav.locator('button').filter({ hasText: 'About' }).click();
    await expect(page.locator('.page-content h2').first()).toHaveText('About');

    await menuNav.locator('button').filter({ hasText: 'Map' }).click();
    await expect(page.locator('remote-work-map')).toBeVisible();
  });
});
