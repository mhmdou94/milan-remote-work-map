import { test, expect } from '@playwright/test';

test.describe('List page', () => {
  test('searching by city shows results and opens place detail', async ({ page }) => {
    await page.goto('/');

    const menuNav = page.locator('menu-nav');
    await menuNav.locator('.menu-toggle').click();
    await menuNav.locator('.menu-item').filter({ hasText: 'List' }).click();

    const listPage = page.locator('list-page');
    await expect(listPage).toBeVisible();

    const searchButton = listPage.locator('button', { hasText: 'Search' });
    await expect(searchButton).toBeDisabled();

    await listPage.locator('select').selectOption('Milano');
    await expect(searchButton).toBeEnabled();

    const placesResponse = page.waitForResponse(
      (res) => res.url().includes('/api/places') && res.url().includes('city=Milano')
    );
    await searchButton.click();
    await placesResponse;

    const results = listPage.locator('.result-item');
    await expect(results.first()).toBeVisible();
    await expect(results).toHaveCount(6);
    await expect(listPage).toContainText('Caffè Nero');

    const wifiInternetItem = listPage.locator('.result-item', {
      hasText: 'Biblioteca Ambrosiana',
    });
    await expect(wifiInternetItem.locator('[title="Internet access"]')).toBeVisible();

    await results.first().click();

    const modal = page.locator('place-detail-modal .modal-backdrop');
    await expect(modal).toBeVisible();

    const googleMapsLink = modal.locator('a', { hasText: 'Open in Google Maps' });
    await expect(googleMapsLink).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/
    );
  });

  test('restricted and not-allowed places show badges and modal notices', async ({ page }) => {
    await page.goto('/');

    const menuNav = page.locator('menu-nav');
    await menuNav.locator('.menu-toggle').click();
    await menuNav.locator('.menu-item').filter({ hasText: 'List' }).click();

    const listPage = page.locator('list-page');
    await listPage.locator('select').selectOption('Milano');

    const placesResponse = page.waitForResponse(
      (res) => res.url().includes('/api/places') && res.url().includes('city=Milano')
    );
    await listPage.locator('button', { hasText: 'Search' }).click();
    await placesResponse;

    const restrictedItem = listPage.locator('.result-item', { hasText: 'Ristorante Alla Scala' });
    await expect(restrictedItem.locator('[title="Laptop use restricted"]')).toBeVisible();

    const notAllowedItem = listPage.locator('.result-item', { hasText: 'Biblioteca Sormani' });
    await expect(notAllowedItem.locator('[title="Not laptop-friendly"]')).toBeVisible();

    await restrictedItem.click();
    const modal = page.locator('place-detail-modal .modal-backdrop');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.restriction-notice')).toContainText(
      'Laptop use restricted: no @ (12:00-15:00,19:00-23:00)'
    );
    await page.locator('place-detail-modal .close-btn').click();

    await notAllowedItem.click();
    await expect(modal).toBeVisible();
    await expect(modal.locator('.not-allowed-notice')).toContainText(
      'Laptop use is not allowed here'
    );
  });

  test('city dropdown is populated from the cities API', async ({ page }) => {
    const citiesResponse = page.waitForResponse((res) => res.url().includes('/api/cities'));
    await page.goto('/');

    const menuNav = page.locator('menu-nav');
    await menuNav.locator('.menu-toggle').click();
    await menuNav.locator('.menu-item').filter({ hasText: 'List' }).click();
    await citiesResponse;

    const options = page.locator('list-page select option');
    await expect(options).toContainText(['Select a city…', 'Milano']);
  });
});
