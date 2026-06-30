import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { centroid } from '@turf/centroid';
import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import { TransitKind, TransitStop } from '../types.js';

const execFileAsync = promisify(execFile);

const TAGS_FILTER_EXPRESSIONS = [
  'n/highway=bus_stop',
  'n/railway=tram_stop,stop,halt,station',
  'n/amenity=bicycle_parking',
  'w/amenity=bicycle_parking',
];

interface OsmiumFeature extends Feature {
  geometry: Geometry;
  properties: Record<string, string> & { '@type'?: string; '@id'?: number };
}

interface OsmiumFeatureCollection extends FeatureCollection {
  features: OsmiumFeature[];
}

export async function extractTransitFromPbf(pbfPath: string): Promise<TransitStop[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transit-extract-'));
  const filteredPath = path.join(tmpDir, 'filtered.osm.pbf');
  const geojsonPath = path.join(tmpDir, 'transit.geojson');

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

    const stops: TransitStop[] = [];
    for (const feature of collection.features) {
      const stop = featureToTransitStop(feature);
      if (stop) stops.push(stop);
    }
    return stops;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function featureToTransitStop(feature: OsmiumFeature): TransitStop | null {
  const { '@type': osmType, '@id': osmIdNum, ...tags } = feature.properties;

  const kind = inferKind(tags);
  if (!kind || !osmType || osmIdNum === undefined) {
    return null;
  }

  const point: Feature<Point> =
    feature.geometry.type === 'Point' ? (feature as Feature<Point>) : centroid(feature as Feature);
  const [longitude, latitude] = point.geometry.coordinates;

  return {
    id: `osm-${osmType[0]}-${osmIdNum}`,
    osmId: `${osmType}/${osmIdNum}`,
    kind,
    name: tags.name || tags['name:en'] || undefined,
    latitude,
    longitude,
    capacity: tags.capacity,
    covered: tags.covered,
  };
}

function inferKind(tags: Record<string, string>): TransitKind | null {
  if (tags.amenity === 'bicycle_parking') return 'bicycle_parking';
  if (tags.highway === 'bus_stop') return 'bus_stop';
  if (tags.railway === 'tram_stop') return 'tram_stop';
  if (tags.railway === 'stop' || tags.railway === 'halt' || tags.railway === 'station') {
    return 'rail_stop';
  }
  return null;
}
