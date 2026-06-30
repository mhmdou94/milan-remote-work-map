// Maps the OSM amenity/shop/leisure/office value (stored as `place.category`)
// to a marker emoji + a human label, used by both the map markers and the legend.
export interface CategoryInfo {
  emoji: string;
  label: string;
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  cafe: { emoji: '☕', label: 'Cafe' },
  restaurant: { emoji: '🍽️', label: 'Restaurant' },
  bar: { emoji: '🍸', label: 'Bar' },
  pub: { emoji: '🍺', label: 'Pub' },
  fast_food: { emoji: '🍔', label: 'Fast food' },
  food_court: { emoji: '🍔', label: 'Food court' },
  library: { emoji: '📚', label: 'Library' },
  coworking_space: { emoji: '💼', label: 'Coworking' },
  coworking: { emoji: '💼', label: 'Coworking' },
  university: { emoji: '🎓', label: 'University' },
  college: { emoji: '🎓', label: 'College' },
  park: { emoji: '🌳', label: 'Park' },
  hotel: { emoji: '🏨', label: 'Hotel' },
  hostel: { emoji: '🏨', label: 'Hostel' },
  bakery: { emoji: '🥐', label: 'Bakery' },
  community_centre: { emoji: '🏛️', label: 'Community centre' },
};

const DEFAULT_CATEGORY: CategoryInfo = { emoji: '📍', label: 'Other' };

export function getCategoryInfo(category?: string): CategoryInfo {
  if (!category) return DEFAULT_CATEGORY;
  return CATEGORY_MAP[category] ?? DEFAULT_CATEGORY;
}

export function getLegendCategories(): { category: string; info: CategoryInfo }[] {
  return ['cafe', 'restaurant', 'bar', 'library', 'coworking_space', 'park'].map((category) => ({
    category,
    info: CATEGORY_MAP[category],
  }));
}
