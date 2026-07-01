import { Request, Response } from 'express';
import { Knex } from 'knex';
import { getNearbyTransitStops } from '../db/queries.js';

const DEFAULT_RADIUS_METERS = 500;
const MAX_RADIUS_METERS = 2000;

export function createNearbyTransitRoute(db: Knex) {
  return async (req: Request, res: Response) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'lat and lon query parameters required' });
      }

      const radius = Math.min(Number(req.query.radius) || DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS);

      const stops = await getNearbyTransitStops(db, lat, lon, radius);

      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json({ stops });
    } catch (error) {
      console.error('Error fetching nearby transit:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
