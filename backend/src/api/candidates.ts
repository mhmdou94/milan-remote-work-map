import { Request, Response } from 'express';
import { Knex } from 'knex';
import { getPlaceCandidates, getCandidateClusters } from '../db/queries.js';
import { ClusterGeoJSONFeature, PlaceCandidate, PlaceCluster } from '../types.js';
import { parseBboxParam } from './bbox.js';

// ~25 km at mid-latitude (25 / 111 ≈ 0.225°)
const CLUSTER_THRESHOLD_DEG = 0.225;

function clusterCellSize(latSpan: number): number {
  return Math.max(0.05, Math.round((latSpan / 10) * 100) / 100);
}

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

      if (bbox.maxLat - bbox.minLat > CLUSTER_THRESHOLD_DEG) {
        const cellSize = clusterCellSize(bbox.maxLat - bbox.minLat);
        const clusters = await getCandidateClusters(db, bbox, cellSize);
        const geojson = {
          type: 'FeatureCollection',
          features: clusters.map(clusterToGeoJSON),
        };
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
        return res.json(geojson);
      }

      const candidates = await getPlaceCandidates(db, bbox);
      const geojson = {
        type: 'FeatureCollection',
        features: candidates.map(candidateToGeoJSON),
      };

      res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
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

function clusterToGeoJSON(cluster: PlaceCluster): ClusterGeoJSONFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [cluster.longitude, cluster.latitude] },
    properties: { type: 'cluster', count: cluster.count },
  };
}
