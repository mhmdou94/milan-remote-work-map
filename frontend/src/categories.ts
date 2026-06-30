// Maps the OSM amenity/shop/leisure/office value (stored as `place.category`)
// to a marker emoji + a human label + an accent color, used by map markers,
// the legend, and card/list accents.
export interface CategoryInfo {
  emoji: string;
  label: string;
  color: string;
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  cafe: { emoji: '☕', label: 'Cafe', color: '#b25614' },
  restaurant: { emoji: '🍽️', label: 'Restaurant', color: '#c2410c' },
  bar: { emoji: '🍸', label: 'Bar', color: '#9333ea' },
  pub: { emoji: '🍺', label: 'Pub', color: '#a16207' },
  fast_food: { emoji: '🍔', label: 'Fast food', color: '#d97706' },
  food_court: { emoji: '🍔', label: 'Food court', color: '#d97706' },
  library: { emoji: '📚', label: 'Library', color: '#7b3ff2' },
  coworking_space: { emoji: '💼', label: 'Coworking', color: '#006cff' },
  coworking: { emoji: '💼', label: 'Coworking', color: '#006cff' },
  university: { emoji: '🎓', label: 'University', color: '#0f766e' },
  college: { emoji: '🎓', label: 'College', color: '#0f766e' },
  park: { emoji: '🌳', label: 'Park', color: '#007f67' },
  hotel: { emoji: '🏨', label: 'Hotel', color: '#be185d' },
  hostel: { emoji: '🏨', label: 'Hostel', color: '#be185d' },
  bakery: { emoji: '🥐', label: 'Bakery', color: '#b45309' },
  community_centre: { emoji: '🏛️', label: 'Community centre', color: '#475569' },
};

const DEFAULT_CATEGORY: CategoryInfo = { emoji: '📍', label: 'Other', color: '#4b5563' };

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
