import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { centroid } from '@turf/centroid';
import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import { Place } from '../types.js';

const execFileAsync = promisify(execFile);

const TAGS_FILTER_EXPRESSIONS = ['n/laptop=yes', 'w/laptop=yes', 'r/laptop=yes'];

interface OsmiumFeature extends Feature {
  geometry: Geometry;
  properties: Record<string, string> & { '@type'?: string; '@id'?: number };
}

interface OsmiumFeatureCollection extends FeatureCollection {
  features: OsmiumFeature[];
}

export async function extractPlacesFromPbf(pbfPath: string): Promise<Place[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbf-extract-'));
  const filteredPath = path.join(tmpDir, 'filtered.osm.pbf');
  const geojsonPath = path.join(tmpDir, 'places.geojson');

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

    const places: Place[] = [];
    for (const feature of collection.features) {
      const place = featureToPlace(feature);
      if (place) places.push(place);
    }
    return places;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function featureToPlace(feature: OsmiumFeature): Place | null {
  const { '@type': osmType, '@id': osmIdNum, ...tags } = feature.properties;

  if (tags.laptop !== 'yes' || !osmType || osmIdNum === undefined) {
    return null;
  }

  const point: Feature<Point> =
    feature.geometry.type === 'Point' ? (feature as Feature<Point>) : centroid(feature as Feature);
  const [longitude, latitude] = point.geometry.coordinates;

  const osmId = `${osmType}/${osmIdNum}`;
  const id = `osm-${osmType[0]}-${osmIdNum}`;

  return {
    id,
    name: tags.name || tags['name:en'] || 'Unknown Place',
    category: inferCategory(tags),
    latitude,
    longitude,
    address: formatAddress(tags),
    city: tags['addr:city'],
    internetAccess: normalizeInternetAccess(tags.internet_access),
    sockets: normalizeSockets(tags.sockets ?? tags.socket ?? tags.power_supply),
    openingHours: tags.opening_hours,
    laptopConditional: tags['laptop:conditional'],
    wifiSsid: tags['internet_access:ssid'],
    wifiFee: normalizeWifiFee(tags['internet_access:fee']),
    wifiPassword: normalizeYesNo(tags['internet_access:password']),
    wheelchair: normalizeWheelchair(tags.wheelchair),
    airConditioning: normalizeYesNo(tags.air_conditioning),
    outdoorSeating: normalizeYesNo(tags.outdoor_seating),
    indoorSeating: normalizeYesNo(tags.indoor_seating),
    smoking: normalizeSmoking(tags.smoking),
    level: tags.level,
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
    fee: normalizeYesNo(tags.fee),
    charge: tags.charge,
    reservation: normalizeReservation(tags.reservation),
    capacity: tags.capacity,
    brand: tags.brand ?? tags.operator,
    drinkingWater: normalizeYesNo(tags.drinking_water),
    toilets: normalizeYesNo(tags.toilets),
    toiletsWheelchair: normalizeYesNo(tags['toilets:wheelchair']),
    dog: normalizeDog(tags.dog),
    osmId,
    osmTags: tags,
    source: 'osm',
    verified: false,
    lastSynced: new Date().toISOString(),
  };
}

export function inferCategory(tags: Record<string, string>): string | undefined {
  if (tags.amenity) return tags.amenity;
  if (tags.shop) return tags.shop;
  if (tags.leisure) return tags.leisure;
  if (tags.office) return tags.office;
  return undefined;
}

export function formatAddress(tags: Record<string, string>): string | undefined {
  const parts: string[] = [];
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

export function normalizeInternetAccess(
  value: string | undefined
): 'yes' | 'no' | 'wired' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'wired' || lower === 'wlan' || lower === 'wifi') return 'wired';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

export function normalizeSockets(value: string | undefined): 'yes' | 'no' | 'many' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'many' || lower === 'lots') return 'many';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

function normalizeYesNo(value: string | undefined): 'yes' | 'no' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

function normalizeWifiFee(value: string | undefined): 'yes' | 'no' | 'customers' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'customers') return 'customers';
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

function normalizeWheelchair(value: string | undefined): 'yes' | 'no' | 'limited' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'limited') return 'limited';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

function normalizeSmoking(
  value: string | undefined
): 'yes' | 'no' | 'outside' | 'separated' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'outside') return 'outside';
  if (lower === 'separated' || lower === 'isolated') return 'separated';
  if (lower === 'yes' || lower === 'true' || lower === 'dedicated') return 'yes';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

function normalizeReservation(value: string | undefined): 'yes' | 'no' | 'recommended' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'recommended') return 'recommended';
  if (lower === 'yes' || lower === 'true' || lower === 'required') return 'yes';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}

function normalizeDog(value: string | undefined): 'yes' | 'no' | 'leashed' | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'leashed' || lower === 'leash') return 'leashed';
  if (lower === 'yes' || lower === 'true') return 'yes';
  if (lower === 'no' || lower === 'false') return 'no';
  return undefined;
}
