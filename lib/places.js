import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'places.csv');
const CSV_DISPLAY_PATH = 'data/places.csv';
const MILAN_CENTER = { lat: 45.4642, lon: 9.19 };
const CATEGORIES = ['Coworking', 'Library', 'Cafe', 'Wi-Fi place', 'Other'];
const REMOTE_WORK_FRIENDLY = ['friendly', 'maybe', 'not_friendly'];
const TRI_STATE = ['on', 'off', 'unknown'];
const COST_OPTIONS = ['free', 'purchase_required', 'paid', 'unknown'];
const CSV_COLUMNS = [
  'id',
  'name',
  'category',
  'latitude',
  'longitude',
  'address',
  'remote_work_friendly',
  'wifi',
  'power_outlets',
  'cost',
  'custom_tags',
  'notes',
  'score',
];

export function getPlaces() {
  ensureCsvFile();

  return {
    places: parsePlacesCsv(readFileSync(CSV_PATH, 'utf8')),
    center: MILAN_CENTER,
    csvPath: CSV_DISPLAY_PATH,
    csvColumns: CSV_COLUMNS,
  };
}

function ensureCsvFile() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!existsSync(CSV_PATH)) {
    writeFileSync(CSV_PATH, `${CSV_COLUMNS.join(',')}\n`, 'utf8');
  }
}

function parsePlacesCsv(csv) {
  const rows = parseCsv(csv);
  const [headers, ...records] = rows;

  if (!headers) {
    return [];
  }

  const normalizedHeaders = headers.map((header) => header.trim());

  return records
    .map((record, index) => toPlace(normalizedHeaders, record, index))
    .filter(Boolean);
}

function toPlace(headers, record, index) {
  const row = Object.fromEntries(headers.map((header, headerIndex) => [header, record[headerIndex] || '']));
  const name = row.name.trim();
  const lat = Number(row.latitude);
  const lon = Number(row.longitude);

  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const remoteWorkFriendly = parseEnum(row.remote_work_friendly, REMOTE_WORK_FRIENDLY, 'maybe');
  const wifi = parseEnum(row.wifi, TRI_STATE, 'unknown');
  const powerOutlets = parseEnum(row.power_outlets, TRI_STATE, 'unknown');
  const cost = parseEnum(row.cost, COST_OPTIONS, 'unknown');
  const score = Number(row.score) || scorePlace({ remoteWorkFriendly, wifi, powerOutlets, cost });

  return {
    id: row.id.trim() || `csv-${index + 1}`,
    source: 'csv',
    name,
    category: parseEnum(row.category, CATEGORIES, 'Other'),
    lat,
    lon,
    address: row.address.trim() || null,
    remoteWorkFriendly,
    wifi,
    powerOutlets,
    cost,
    customTags: row.custom_tags
      .split('|')
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: row.notes.trim() || null,
    score: Math.max(1, Math.min(5, score)),
  };
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (inQuotes && char === '"' && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(field);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  return rows;
}

function parseEnum(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function scorePlace({ remoteWorkFriendly, wifi, powerOutlets, cost }) {
  let score = 1;

  if (remoteWorkFriendly === 'friendly') {
    score += 2;
  }

  if (remoteWorkFriendly === 'maybe') {
    score += 1;
  }

  if (wifi === 'on') {
    score += 1;
  }

  if (powerOutlets === 'on') {
    score += 1;
  }

  if (cost === 'free' || cost === 'purchase_required') {
    score += 1;
  }

  if (remoteWorkFriendly === 'not_friendly') {
    score = Math.min(score, 2);
  }

  return Math.min(score, 5);
}
