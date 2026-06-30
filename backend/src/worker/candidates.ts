import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { centroid } from '@turf/centroid';
import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import { PlaceCandidate } from '../types.js';
import { inferCategory, formatAddress, normalizeInternetAccess, normalizeSockets } from './pbf.js';

const execFileAsync = promisify(execFile);

const TAGS_FILTER_EXPRESSIONS = [
  'n/internet_access',
  'w/internet_access',
  'r/internet_access',
  'n/sockets',
  'w/sockets',
  'r/sockets',
];

// Categories where laptop work is plausible. Excludes things like
// tourism=hotel or railway=station, which also carry internet_access/sockets
// but aren't sit-down work venues.
const RELEVANT_CATEGORIES = new Set([
  'cafe',
  'bar',
  'pub',
  'fast_food',
  'food_court',
  'library',
  'coworking',
  'coworking_space',
  'community_centre',
  'bakery',
]);

interface OsmiumFeature extends Feature {
  geometry: Geometry;
  properties: Record<string, string> & { '@type'?: string; '@id'?: number };
}

interface OsmiumFeatureCollection extends FeatureCollection {
  features: OsmiumFeature[];
}

export async function extractCandidatesFromPbf(pbfPath: string): Promise<PlaceCandidate[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'candidates-extract-'));
  const filteredPath = path.join(tmpDir, 'filtered.osm.pbf');
  const geojsonPath = path.join(tmpDir, 'candidates.geojson');

  try {
    await execFileAsync('osmium', [
      'tags-filter',
      '--overwrite',
      '-o',
      filteredPath,
      pbfPath,
      ...TAGS_FILTER_EXPRESSIONS,
    ]);

    await execFileAsync('osmium', [
      'export',
      '--overwrite',
      '-f',
      'geojson',
      '-a',
      'type,id',
      '-o',
      geojsonPath,
      filteredPath,
    ]);

    const collection = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8')) as OsmiumFeatureCollection;

    const candidates: PlaceCandidate[] = [];
    for (const feature of collection.features) {
      const candidate = featureToCandidate(feature);
      if (candidate) candidates.push(candidate);
    }
    return candidates;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function featureToCandidate(feature: OsmiumFeature): PlaceCandidate | null {
  const { '@type': osmType, '@id': osmIdNum, ...tags } = feature.properties;

  if (tags.laptop === 'yes' || tags.laptop === 'no' || !osmType || osmIdNum === undefined) {
    return null;
  }

  const category = inferCategory(tags);
  if (!category || !RELEVANT_CATEGORIES.has(category)) {
    return null;
  }

  const point: Feature<Point> =
    feature.geometry.type === 'Point' ? (feature as Feature<Point>) : centroid(feature as Feature);
  const [longitude, latitude] = point.geometry.coordinates;

  return {
    id: `osm-${osmType[0]}-${osmIdNum}`,
    osmId: `${osmType}/${osmIdNum}`,
    name: tags.name || tags['name:en'] || 'Unknown Place',
    category,
    latitude,
    longitude,
    address: formatAddress(tags),
    city: tags['addr:city'],
    internetAccess: normalizeInternetAccess(tags.internet_access),
    sockets: normalizeSockets(tags.sockets ?? tags.socket ?? tags.power_supply),
    osmTags: tags,
  };
}
