import type { TransitStop } from '../types.js';

export async function fetchNearbyTransit(
  lat: number,
  lon: number,
  radius: number,
  signal?: AbortSignal
): Promise<TransitStop[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius: String(radius),
  });
  const res = await fetch(`/api/transit/nearby?${params}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return data.stops ?? [];
}

const KIND_INFO: Record<TransitStop['kind'], { icon: string; label: string; groupLabel: string }> =
  {
    bus_stop: { icon: '🚌', label: 'Bus stop', groupLabel: 'Bus stops' },
    tram_stop: { icon: '🚋', label: 'Tram stop', groupLabel: 'Tram stops' },
    rail_stop: { icon: '🚆', label: 'Train station', groupLabel: 'Train stations' },
    bicycle_parking: { icon: '🚲', label: 'Bicycle parking', groupLabel: 'Bicycle parking' },
  };

export const TRANSIT_KIND_ORDER: TransitStop['kind'][] = [
  'bicycle_parking',
  'bus_stop',
  'tram_stop',
  'rail_stop',
];

export function getTransitKindInfo(kind: TransitStop['kind']) {
  return KIND_INFO[kind];
}

export interface NavLinks {
  googleMaps: string;
  appleMaps: string;
  osm: string;
}

export function getNavLinks(lat: number, lon: number): NavLinks {
  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    appleMaps: `https://maps.apple.com/?ll=${lat},${lon}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`,
  };
}

// OSM frequently has multiple nodes for the same named stop (separate poles
// per line, opposite platforms, etc). Collapse those to the closest one so
// the list reads as "places", not "OSM nodes". Stops without a name aren't
// deduped — they're not actually known to be the same spot.
export function dedupeTransitStops(stops: TransitStop[]): TransitStop[] {
  const byName = new Map<string, TransitStop>();
  const unnamed: TransitStop[] = [];

  for (const stop of stops) {
    if (!stop.name) {
      unnamed.push(stop);
      continue;
    }
    const existing = byName.get(stop.name);
    if (!existing || stop.distanceMeters < existing.distanceMeters) {
      byName.set(stop.name, stop);
    }
  }

  return [...byName.values(), ...unnamed].sort((a, b) => a.distanceMeters - b.distanceMeters);
}
