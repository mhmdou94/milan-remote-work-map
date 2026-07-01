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

    const geojson = await response.json();
    const names = geojson.features.map((f: { properties: { name: string } }) => f.properties.name);
    expect(names).toContain('Biblioteca Ambrosiana');
  });

  test('discovery panel highlights best work spots and quick filters', async ({ page }) => {
    const initialResponse = page.waitForResponse((res) => res.url().includes('/api/places'));
    await page.goto('/');
    await initialResponse;

    const panel = page.locator('remote-work-app .discovery-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Find your next work spot.');
    await expect(panel.locator('.spot-card').first()).toContainText('Work fit');

    await panel.locator('input[type="search"]').fill('coworking');
    await expect(panel.locator('.spot-card')).toHaveCount(1);
    await expect(panel.locator('.spot-card')).toContainText('Coworking Space Milano');

    const filteredResponse = page.waitForResponse(
      (res) => res.url().includes('/api/places') && res.url().includes('sockets=yes')
    );
    await panel.locator('.quick-chip', { hasText: 'Power' }).click();
    await filteredResponse;

    const filterButton = page.locator('filter-popover .filter-btn');
    await expect(filterButton).toContainText('1');
  });

  test('mobile controls stay usable above map chrome', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 45.4642, longitude: 9.19 });

    await page.goto('/');

    const filterButton = page.locator('filter-popover .filter-btn');
    const legendButton = page.locator('legend-popover .legend-btn');

    await filterButton.click();
    await expect(page.locator('filter-popover .filter-popover')).toBeVisible();

    await legendButton.click();
    await expect(page.locator('legend-popover .legend-popover')).toBeVisible();
    await expect(page.locator('filter-popover .filter-popover')).toHaveCount(0);

    const locateButton = page.locator('remote-work-map .locate-btn');
    await locateButton.click();
    await expect(locateButton).toContainText('Locate me');
  });

  test('mobile place detail actions are above the bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/p/test-1');

    await expect(page.locator('place-detail-modal')).toBeVisible();

    const viewOnMap = page.locator('place-detail-modal .view-map-btn');
    await viewOnMap.click();

    await expect(page).toHaveURL('/p/test-1');
    await expect(page.locator('remote-work-map')).toBeVisible();
  });
});
