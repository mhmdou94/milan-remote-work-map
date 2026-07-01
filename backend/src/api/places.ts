import { Request, Response } from 'express';
import { Knex } from 'knex';
import { getDistinctCities, getPlaces, getPlaceClusters } from '../db/queries.js';
import {
  ClusterGeoJSONFeature,
  GeoJSONCollection,
  GeoJSONFeature,
  Place,
  PlaceCluster,
} from '../types.js';
import { parseBboxParam } from './bbox.js';

// Switch to clustering when the viewport spans more than this many degrees of latitude.
// ~25 km at mid-latitude (25 / 111 ≈ 0.225°)
const CLUSTER_THRESHOLD_DEG = 0.225;

function clusterCellSize(latSpan: number): number {
  return Math.max(0.05, Math.round((latSpan / 10) * 100) / 100);
}

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

      // Large viewport — return grid clusters instead of individual places.
      if (bbox && bbox.maxLat - bbox.minLat > CLUSTER_THRESHOLD_DEG) {
        const cellSize = clusterCellSize(bbox.maxLat - bbox.minLat);
        const clusters = await getPlaceClusters(db, bbox, cellSize);
        const geojson: GeoJSONCollection = {
          type: 'FeatureCollection',
          features: clusters.map(clusterToGeoJSON),
        };
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        return res.json(geojson);
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

function clusterToGeoJSON(cluster: PlaceCluster): ClusterGeoJSONFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [cluster.longitude, cluster.latitude] },
    properties: { type: 'cluster', count: cluster.count },
  };
}
