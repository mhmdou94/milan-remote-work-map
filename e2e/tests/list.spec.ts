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
    await expect(results).toHaveCount(5);
    await expect(listPage).toContainText('Caffè Nero');

    await results.first().click();

    const modal = page.locator('place-detail-modal .modal-backdrop');
    await expect(modal).toBeVisible();

    const googleMapsLink = modal.locator('a', { hasText: 'Open in Google Maps' });
    await expect(googleMapsLink).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/
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
