import { OverpassResponse, OverpassElement, Place } from '../types.js';

// Italy bounding box: [south, west, north, east]
const ITALY_BBOX = '43.6,6.6,47.6,12.6';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT = 180;

export async function fetchFromOverpass(): Promise<Place[]> {
  const query = buildQuery();

  console.log('Fetching from Overpass API...');
  console.log(`Query: ${query.substring(0, 100)}...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT * 1000);

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OverpassResponse;
    console.log(`✓ Fetched ${data.elements.length} elements from Overpass`);

    return parseElements(data.elements);
  } catch (error) {
    console.error('❌ Error fetching from Overpass:', error);
    throw error;
  }
}

function buildQuery(): string {
  return `[timeout:${TIMEOUT}][out:json];
(
  node["laptop"="yes"](${ITALY_BBOX});
  way["laptop"="yes"](${ITALY_BBOX});
  relation["laptop"="yes"](${ITALY_BBOX});
);
out center;`;
}

function parseElements(elements: OverpassElement[]): Place[] {
  const places: Place[] = [];

  for (const element of elements) {
    const place = elementToPlace(element);
    if (place) {
      places.push(place);
    }
  }

  console.log(`Parsed ${places.length} valid places`);
  return places;
}

function elementToPlace(element: OverpassElement): Place | null {
  const tags = element.tags || {};

  // Skip if laptop is not 'yes'
  if (tags.laptop !== 'yes') {
    return null;
  }

  // Get coordinates
  let lat = element.lat;
  let lon = element.lon;
  if (element.center) {
    lat = element.center.lat;
    lon = element.center.lon;
  }

  if (!lat || !lon) {
    return null;
  }

  // Generate ID from OSM id
  const id = `osm-${element.type[0]}-${element.id}`;

  // Infer category from OSM tags
  const category = inferCategory(tags);

  return {
    id,
    name: tags.name || tags['name:en'] || 'Unknown Place',
    category,
    latitude: lat,
    longitude: lon,
    address: formatAddress(tags),
    internetAccess: normalizeInternetAccess(tags.internet_access),
    sockets: normalizeSockets(tags.sockets),
    openingHours: tags.opening_hours,
    osmId: `${element.type}/${element.id}`,
    osmTags: tags,
    source: 'osm',
    verified: false,
    lastSynced: new Date().toISOString(),
  };
}

function inferCategory(tags: Record<string, string>): string | undefined {
  if (tags.amenity) return tags.amenity;
  if (tags.shop) return tags.shop;
  if (tags.leisure) return tags.leisure;
  if (tags.office) return tags.office;
  return undefined;
}

function formatAddress(tags: Record<string, string>): string | undefined {
  const parts: string[] = [];
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function normalizeInternetAccess(value: string | undefined): 'yes' | 'no' | 'wired' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'wired' || lower === 'wlan' || lower === 'wifi') return 'wired';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

function normalizeSockets(value: string | undefined): 'yes' | 'no' | 'many' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'many' || lower === 'lots') return 'many';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}
