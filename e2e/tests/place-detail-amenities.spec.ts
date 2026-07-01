import { test, expect } from '@playwright/test';

async function openPlaceModal(page: import('@playwright/test').Page, placeName: string) {
  await page.goto('/');

  const menuNav = page.locator('menu-nav');
  await menuNav.locator('.menu-item').filter({ hasText: 'List' }).click();

  const listPage = page.locator('list-page');
  await listPage.locator('select').selectOption('Milano');

  const placesResponse = page.waitForResponse(
    (res) => res.url().includes('/api/places') && res.url().includes('city=Milano')
  );
  await listPage.locator('button', { hasText: 'Show places' }).click();
  await placesResponse;

  await listPage.locator('.result-item', { hasText: placeName }).click();

  const modal = page.locator('place-detail-modal .modal-backdrop');
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('Place detail modal – amenities panel', () => {
  test('always shows Internet and Power sockets, hides extras behind Show more, and puts wheelchair in a separate Accessibility section', async ({
    page,
  }) => {
    // Caffè Nero: internet=yes, sockets=yes, wifi, airConditioning, outdoorSeating, smoking, wheelchair=yes
    const modal = await openPlaceModal(page, 'Caffè Nero');

    const amenitiesSection = modal.locator('.modal-section', { hasText: 'Amenities' }).first();
    await expect(amenitiesSection).toBeVisible();

    // Internet and Power sockets are always visible
    const internetAmenity = amenitiesSection.locator('.amenity', { hasText: 'Internet' });
    await expect(internetAmenity).toBeVisible();
    await expect(internetAmenity.locator('.amenity-value')).toHaveText('Yes');

    const socketsAmenity = amenitiesSection.locator('.amenity', { hasText: 'Power sockets' });
    await expect(socketsAmenity).toBeVisible();
    await expect(socketsAmenity.locator('.amenity-value')).toHaveText('Yes');

    // Extra amenities are hidden until Show more is clicked
    await expect(
      amenitiesSection.locator('.amenity', { hasText: 'WiFi network' })
    ).not.toBeVisible();

    const showMoreBtn = amenitiesSection.locator('.show-more-btn');
    await expect(showMoreBtn).toBeVisible();
    await showMoreBtn.click();

    await expect(amenitiesSection.locator('.amenity', { hasText: 'WiFi network' })).toBeVisible();

    // Show less collapses again
    await expect(showMoreBtn).toHaveText('Show less');
    await showMoreBtn.click();
    await expect(
      amenitiesSection.locator('.amenity', { hasText: 'WiFi network' })
    ).not.toBeVisible();

    // Wheelchair is in the Accessibility section, not in Amenities
    const accessibilitySection = modal.locator('.modal-section', { hasText: 'Accessibility' });
    await expect(accessibilitySection).toBeVisible();
    const wheelchairAmenity = accessibilitySection.locator('.amenity', {
      hasText: 'Wheelchair access',
    });
    await expect(wheelchairAmenity).toBeVisible();
    await expect(wheelchairAmenity.locator('.amenity-value')).toHaveText('Yes');

    // Wheelchair must NOT appear inside the Amenities section
    await expect(
      amenitiesSection.locator('.amenity', { hasText: 'Wheelchair access' })
    ).not.toBeVisible();
  });

  test('shows No for sockets when unavailable, and Limited for partial wheelchair access', async ({
    page,
  }) => {
    // Biblioteca Ambrosiana: internet=wlan, sockets=no, wheelchair=limited
    const modal = await openPlaceModal(page, 'Biblioteca Ambrosiana');

    const amenitiesSection = modal.locator('.modal-section', { hasText: 'Amenities' }).first();

    const socketsAmenity = amenitiesSection.locator('.amenity', { hasText: 'Power sockets' });
    await expect(socketsAmenity).toBeVisible();
    await expect(socketsAmenity.locator('.amenity-value')).toHaveText('No');

    const internetAmenity = amenitiesSection.locator('.amenity', { hasText: 'Internet' });
    await expect(internetAmenity).toBeVisible();
    await expect(internetAmenity.locator('.amenity-value')).toHaveText('WiFi');

    const accessibilitySection = modal.locator('.modal-section', { hasText: 'Accessibility' });
    await expect(accessibilitySection).toBeVisible();
    await expect(
      accessibilitySection
        .locator('.amenity', { hasText: 'Wheelchair access' })
        .locator('.amenity-value')
    ).toHaveText('Limited');
  });

  test('hides Accessibility section when no wheelchair data is available', async ({ page }) => {
    // Ristorante Alla Scala: internet=yes, sockets=yes, no wheelchair field
    const modal = await openPlaceModal(page, 'Ristorante Alla Scala');

    const amenitiesSection = modal.locator('.modal-section', { hasText: 'Amenities' }).first();
    await expect(amenitiesSection).toBeVisible();

    // Accessibility section should not exist
    await expect(modal.locator('.modal-section', { hasText: 'Accessibility' })).not.toBeVisible();
  });
});
