import { Request, Response } from 'express';
import { Database as SqlJsDatabase } from 'sql.js';
import { getPlacesByBBox } from '../db/queries.js';
import { BBox, GeoJSONCollection, GeoJSONFeature, Place } from '../types.js';

export function createPlacesRoute(db: SqlJsDatabase) {
  return (req: Request, res: Response) => {
    try {
      // Parse bbox from query: ?bbox=minLat,minLon,maxLat,maxLon
      const bboxStr = req.query.bbox as string;
      if (!bboxStr) {
        return res.status(400).json({ error: 'bbox query parameter required' });
      }

      const [minLat, minLon, maxLat, maxLon] = bboxStr.split(',').map(Number);
      if (isNaN(minLat) || isNaN(minLon) || isNaN(maxLat) || isNaN(maxLon)) {
        return res.status(400).json({ error: 'Invalid bbox coordinates' });
      }

      const bbox: BBox = { minLat, minLon, maxLat, maxLon };

      const filters = {
        internetAccess: req.query.internet_access === 'yes',
        sockets: req.query.sockets === 'yes',
        openNow: req.query.open_now === '1',
      };

      const places = getPlacesByBBox(db, bbox, filters);
      const geojson: GeoJSONCollection = {
        type: 'FeatureCollection',
        features: places.map(placeToGeoJSON),
      };

      res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
      res.json(geojson);
    } catch (error) {
      console.error('Error fetching places:', error);
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
