import { test, expect } from '@playwright/test';

// Programmatically pan the Leaflet map to a given lat/lon via the shadow DOM.
// Returns once Leaflet has finished the move (moveend fired).
async function panMapTo(
  page: Parameters<Parameters<typeof test>[1]>[0],
  lat: number,
  lon: number,
  zoom = 13
) {
  await page.evaluate(
    ({ lat, lon, zoom }) => {
      const app = document.querySelector('remote-work-app') as any;
      const mapEl = app?.shadowRoot?.querySelector('remote-work-map') as any;
      return new Promise<void>((resolve) => {
        mapEl.map.once('moveend', () => resolve());
        mapEl.map.setView([lat, lon], zoom);
      });
    },
    { lat, lon, zoom }
  );
}

function parseBbox(url: string) {
  const raw = new URL(url).searchParams.get('bbox');
  if (!raw) return null;
  const [minLat, minLon, maxLat, maxLon] = raw.split(',').map(Number);
  return { minLat, minLon, maxLat, maxLon };
}

test.describe('Viewport-aware fetching', () => {
  test('places request bbox matches the map viewport after panning', async ({ page }) => {
    // Wait for the initial map-ready fetch to settle
    const initialLoad = page.waitForResponse((res) => res.url().includes('/api/places'));
    await page.goto('/');
    await initialLoad;

    // Pan to Rome and capture the debounced refetch
    const romaFetch = page.waitForResponse(
      (res) => res.url().includes('/api/places') && !res.url().includes('/candidates')
    );
    await panMapTo(page, 41.9028, 12.4964);
    const response = await romaFetch;

    expect(response.ok()).toBe(true);
    const bbox = parseBbox(response.url());
    expect(bbox).not.toBeNull();
    // Roma is ~41.9°N — bbox should be nowhere near Milan's hardcoded 45.x range
    expect(bbox!.minLat).toBeGreaterThan(40);
    expect(bbox!.maxLat).toBeLessThan(43);
    expect(bbox!.minLon).toBeGreaterThan(11);
    expect(bbox!.maxLon).toBeLessThan(14);
  });

  test('candidates request bbox matches the map viewport when filter is toggled outside Milan', async ({
    page,
  }) => {
    const initialLoad = page.waitForResponse((res) => res.url().includes('/api/places'));
    await page.goto('/');
    await initialLoad;

    // Pan to Rome before enabling the filter
    const movedFetch = page.waitForResponse(
      (res) => res.url().includes('/api/places') && !res.url().includes('/candidates')
    );
    await panMapTo(page, 41.9028, 12.4964);
    await movedFetch;

    // Enable the candidates filter and capture the candidates request
    const filterBtn = page.locator('filter-popover .filter-btn');
    await filterBtn.click();
    const candidatesCheckbox = page
      .locator('filter-popover .filter-item')
      .filter({ hasText: 'Show suggested places' })
      .locator('input[type="checkbox"]');

    const candidatesFetch = page.waitForResponse((res) =>
      res.url().includes('/api/places/candidates')
    );
    await candidatesCheckbox.check();
    const response = await candidatesFetch;

    expect(response.ok()).toBe(true);
    const bbox = parseBbox(response.url());
    expect(bbox).not.toBeNull();
    expect(bbox!.minLat).toBeGreaterThan(40);
    expect(bbox!.maxLat).toBeLessThan(43);
    expect(bbox!.minLon).toBeGreaterThan(11);
    expect(bbox!.maxLon).toBeLessThan(14);
  });

  test('candidates request uses Milan viewport when filter is toggled at default view', async ({
    page,
  }) => {
    const initialLoad = page.waitForResponse((res) => res.url().includes('/api/places'));
    await page.goto('/');
    await initialLoad;

    const filterBtn = page.locator('filter-popover .filter-btn');
    await filterBtn.click();
    const candidatesCheckbox = page
      .locator('filter-popover .filter-item')
      .filter({ hasText: 'Show suggested places' })
      .locator('input[type="checkbox"]');

    const candidatesFetch = page.waitForResponse((res) =>
      res.url().includes('/api/places/candidates')
    );
    await candidatesCheckbox.check();
    const response = await candidatesFetch;

    expect(response.ok()).toBe(true);
    const bbox = parseBbox(response.url());
    expect(bbox).not.toBeNull();
    // Default view is Milan — bbox should be in the 45.x lat range
    expect(bbox!.minLat).toBeGreaterThan(44);
    expect(bbox!.maxLat).toBeLessThan(47);

    const geojson = await response.json();
    const names = geojson.features.map((f: { properties: { name: string } }) => f.properties.name);
    expect(names).toContain('Candidate Café Milano');
  });
});
