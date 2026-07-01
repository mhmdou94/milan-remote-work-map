import { Request, Response } from 'express';
import { Knex } from 'knex';
import { getDistinctCities, getPlaces } from '../db/queries.js';
import { GeoJSONCollection, GeoJSONFeature, Place } from '../types.js';
import { parseBboxParam } from './bbox.js';

export function createPlacesRoute(db: Knex) {
  return async (req: Request, res: Response) => {
    try {
      // Either a bbox (?bbox=minLat,minLon,maxLat,maxLon) or a city
      // (?city=Milano) must be given to scope the results.
      const city = req.query.city as string | undefined;

      const bbox = parseBboxParam(req.query.bbox as string | undefined);
      if (bbox === null) {
        return res.status(400).json({ error: 'Invalid bbox coordinates' });
      }

      if (!bbox && !city) {
        return res.status(400).json({ error: 'bbox or city query parameter required' });
      }

      const filters = {
        bbox,
        city,
        internetAccess: req.query.internet_access === 'yes',
        sockets: req.query.sockets === 'yes',
        openNow: req.query.open_now === '1',
        includeDeleted: req.query.include_deleted === '1',
        onlyDeleted: req.query.only_deleted === '1',
      };

      const places = await getPlaces(db, filters);
      const geojson: GeoJSONCollection = {
        type: 'FeatureCollection',
        features: places.map(placeToGeoJSON),
      };

      // open_now is time-dependent so it can't be cached
      const cacheHeader = filters.openNow
        ? 'no-store'
        : 'public, max-age=86400, stale-while-revalidate=3600';
      res.set('Cache-Control', cacheHeader);
      res.json(geojson);
    } catch (error) {
      console.error('Error fetching places:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function createCitiesRoute(db: Knex) {
  return async (_req: Request, res: Response) => {
    try {
      const cities = await getDistinctCities(db);
      res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
      res.json({ cities });
    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

function placeToGeoJSON(place: Place): GeoJSONFeature {
  const { latitude, longitude, ...properties } = place;
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON uses [lon, lat]
    },
    properties: properties as any,
  };
}
