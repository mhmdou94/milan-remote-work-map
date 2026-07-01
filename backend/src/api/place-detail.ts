import { Request, Response } from 'express';
import { Knex } from 'knex';
import { getPlaceById, getPlaceCandidateById } from '../db/queries.js';
import { Place, PlaceCandidate } from '../types.js';

// Looks up a single place by id for deep-linked `/p/:id` URLs — checks
// confirmed places first, then falls back to unverified candidates so a
// shared link still resolves to something, just flagged as unverified.
export function createPlaceByIdRoute(db: Knex) {
  return async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const place = await getPlaceById(db, id);
      if (place) {
        res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
        return res.json({ ...place, unverified: false });
      }

      const candidate = await getPlaceCandidateById(db, id);
      if (candidate) {
        res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
        return res.json(candidateToPlace(candidate));
      }

      res.status(404).json({ error: 'Place not found' });
    } catch (error) {
      console.error('Error fetching place by id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

function candidateToPlace(candidate: PlaceCandidate): Place {
  return {
    id: candidate.id,
    name: candidate.name,
    category: candidate.category,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    address: candidate.address,
    city: candidate.city,
    internetAccess: candidate.internetAccess,
    sockets: candidate.sockets,
    osmId: candidate.osmId,
    osmTags: candidate.osmTags,
    source: 'osm',
    verified: false,
    unverified: true,
  };
}
