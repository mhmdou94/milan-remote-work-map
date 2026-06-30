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

  // Regression test: place-detail-modal's `.modal-backdrop` used `max-height`
  // without `box-sizing: border-box`, so its padding/border were added on top
  // of the cap instead of being included in it. On a desktop-width viewport
  // short enough that content didn't fit, the panel (anchored to the bottom
  // via `:host { bottom: 16px }`) grew taller than its max-height and its top
  // — including the close button — was pushed off-screen above the viewport.
  test('place detail panel stays fully within a short desktop viewport', async ({ page }) => {
    // Reviews come from the live api.mangrove.reviews service keyed on these
    // fixed test coordinates — the real review count for that subject grows
    // over time (e.g. from this very suite's submit-review test running
    // elsewhere), which would make the panel's content height, and thus this
    // geometry assertion, non-deterministic. Stub it so content height only
    // reflects this test's own (fixed) seed data.
    await page.route('https://api.mangrove.reviews/**', (route) =>
      route.fulfill({ json: { reviews: [] } })
    );

    await page.setViewportSize({ width: 1400, height: 650 });

    const placesResponse = page.waitForResponse((res) => res.url().includes('/api/places'));
    await page.goto('/');
    await placesResponse;
    await page.waitForTimeout(500);

    await openFirstPlaceDetail(page);

    // The panel slides up over 250ms (`@keyframes slideUp`, translateY 40px
    // → 0); measuring immediately would catch it mid-animation, still
    // offset downward from its resting position, and produce a false
    // failure unrelated to actual layout.
    await page.waitForTimeout(350);

    const modal = page.locator('place-detail-modal .modal-backdrop');
    const box = await modal.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

    const closeBtn = page.locator('place-detail-modal .close-btn');
    await expect(closeBtn).toBeInViewport();
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });
});
