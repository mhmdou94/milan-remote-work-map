import type { Place, PlaceCandidate } from '../types.js';

// Suggested places aren't confirmed laptop-friendly — this synthesizes a
// Place-shaped object so the same place-detail-modal can render them, with
// `unverified: true` triggering its "help us verify" banner.
export function candidateToPlace(candidate: PlaceCandidate): Place {
  return {
    id: candidate.id,
    name: candidate.name,
    category: candidate.category,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    address: candidate.address,
    internetAccess: candidate.internetAccess,
    sockets: candidate.sockets,
    osmId: candidate.osmId,
    source: 'osm',
    verified: false,
    unverified: true,
  };
}
