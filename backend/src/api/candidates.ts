import { Request, Response } from 'express';
import { Knex } from 'knex';
import { getPlaceCandidates } from '../db/queries.js';
import { PlaceCandidate } from '../types.js';
import { parseBboxParam } from './bbox.js';

export function createCandidatesRoute(db: Knex) {
  return async (req: Request, res: Response) => {
    try {
      const bbox = parseBboxParam(req.query.bbox as string | undefined);
      if (bbox === null) {
        return res.status(400).json({ error: 'Invalid bbox coordinates' });
      }
      if (!bbox) {
        return res.status(400).json({ error: 'bbox query parameter required' });
      }

      const candidates = await getPlaceCandidates(db, bbox);
      const geojson = {
        type: 'FeatureCollection',
        features: candidates.map(candidateToGeoJSON),
      };

      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(geojson);
    } catch (error) {
      console.error('Error fetching place candidates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

function candidateToGeoJSON(candidate: PlaceCandidate) {
  const { latitude, longitude, ...properties } = candidate;
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [longitude, latitude],
    },
    properties,
  };
}
