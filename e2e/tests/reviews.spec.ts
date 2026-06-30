import { test, expect, type Page } from '@playwright/test';

// Seeded places start out clustered at the default zoom, and clicking a
// cluster icon just zooms in rather than opening a place — drilling down by
// click alone is flaky (clusters can spiderfy or re-cluster unpredictably).
// Force a high zoom directly via the Leaflet map instance (exposed as
// `.map` on the <remote-work-map> element) so every seeded marker — spread
// across central Milan — is guaranteed to render as an individual marker.
//
// <remote-work-map> lives inside <remote-work-app>'s shadow root, so plain
// `document.querySelector` (used by page.evaluate/waitForFunction, unlike
// Playwright locators) can't see it directly — pierce the shadow root by hand.
// These callbacks run in the browser, so they must be fully self-contained
// (no references to Node-scope helpers).
//
// `place-detail-modal`'s :host has position:fixed with no explicit display,
// so the host's own box collapses to zero size even though its shadow
// content (`.modal-backdrop`, also fixed) renders fine — check the inner
// element's visibility, not the custom element host's.
async function openFirstPlaceDetail(page: Page) {
  await page.waitForFunction(() => {
    const app = document.querySelector('remote-work-app');
    const mapEl = app?.shadowRoot?.querySelector('remote-work-map') as unknown as {
      map: unknown;
    } | null;
    return mapEl?.map != null;
  });

  // Re-center on a known seed place (Caffè Nero) and zoom in deterministically.
  // setView (not setZoom) guards against requestGeolocation() winning the race
  // and recentering the map away from Milan after our forced zoom.
  await page.evaluate(() => {
    const app = document.querySelector('remote-work-app');
    const mapEl = app?.shadowRoot?.querySelector('remote-work-map') as unknown as {
      map: { setView: (latlng: [number, number], zoom: number) => void };
    };
    mapEl.map.setView([45.4642, 9.19], 18);
  });

  const markerIcons = page.locator('remote-work-map .leaflet-marker-icon');
  await expect(markerIcons.first()).toBeVisible({ timeout: 10000 });
  await markerIcons.first().click({ force: true });

  const modalContent = page.locator('place-detail-modal .modal-backdrop');
  await expect(modalContent).toBeVisible();
}

test.describe('Place detail - Mangrove reviews', () => {
  test('shows a review summary and a submission form for a selected place', async ({ page }) => {
    const placesResponse = page.waitForResponse((res) => res.url().includes('/api/places'));
    await page.goto('/');
    await placesResponse;
    await page.waitForTimeout(500);

    await openFirstPlaceDetail(page);

    const modal = page.locator('place-detail-modal .modal-backdrop');
    await expect(modal).toContainText('Reviews');

    // Submission form is present even before any reviews load.
    const reviewForm = modal.locator('.review-form');
    await expect(reviewForm).toBeVisible();
    await expect(reviewForm.locator('.star-btn')).toHaveCount(5);
    await expect(reviewForm.locator('textarea')).toBeVisible();
    await expect(reviewForm.locator('a', { hasText: 'Mangrove.reviews' })).toHaveAttribute(
      'href',
      'https://mangrove.reviews'
    );

    const submitButton = reviewForm.locator('button', { hasText: /Submit review/ });
    await expect(submitButton).toBeDisabled();

    // Picking a star rating enables submission.
    await reviewForm.locator('.star-btn').nth(3).click();
    await expect(submitButton).toBeEnabled();
  });
});
