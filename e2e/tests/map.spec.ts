import { test, expect } from '@playwright/test';

test.describe('Map page', () => {
  test('loads the app and renders the map with seeded places', async ({ page }) => {
    const placesResponse = page.waitForResponse((res) => res.url().includes('/api/places'));

    await page.goto('/');

    await expect(page.locator('remote-work-app')).toBeVisible();
    await expect(page.locator('remote-work-map')).toBeVisible();
    await expect(page.locator('remote-work-map .leaflet-container')).toBeVisible();

    const response = await placesResponse;
    expect(response.ok()).toBe(true);

    const geojson = await response.json();
    const names = geojson.features.map((f: { properties: { name: string } }) => f.properties.name);

    expect(geojson.features.length).toBeGreaterThanOrEqual(5);
    expect(names).toContain('Caffè Nero');
    expect(names).toContain('Biblioteca Ambrosiana');
  });

  test('legend popover lists the place categories', async ({ page }) => {
    await page.goto('/');

    const legendButton = page.locator('legend-popover .legend-btn');
    await expect(legendButton).toBeVisible();
    await legendButton.click();

    const legendPopover = page.locator('legend-popover .legend-popover');
    await expect(legendPopover).toBeVisible();
    await expect(legendPopover).toContainText('Cafe');
    await expect(legendPopover).toContainText('Recently removed from OSM');
  });

  test('filter popover toggles and refetches places with the right query params', async ({
    page,
  }) => {
    const initialResponse = page.waitForResponse((res) => res.url().includes('/api/places'));
    await page.goto('/');
    await initialResponse;

    const filterButton = page.locator('filter-popover .filter-btn');
    await filterButton.click();

    const internetCheckbox = page
      .locator('filter-popover .filter-item')
      .filter({ hasText: 'Has internet access' })
      .locator('input[type="checkbox"]');

    const filteredResponse = page.waitForResponse(
      (res) => res.url().includes('/api/places') && res.url().includes('internet_access=yes')
    );
    await internetCheckbox.check();
    const response = await filteredResponse;
    expect(response.ok()).toBe(true);
  });
});
