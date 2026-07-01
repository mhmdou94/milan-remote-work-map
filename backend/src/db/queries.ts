import { Knex } from 'knex';
import {
  Place,
  BBox,
  StagedPlace,
  TransitStop,
  TransitStopWithDistance,
  PlaceCandidate,
} from '../types.js';

interface PlaceRow {
  id: string;
  name: string;
  category: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  internet_access: string | null;
  sockets: string | null;
  opening_hours: string | null;
  laptop_status: string | null;
  laptop_conditional: string | null;
  wifi_ssid: string | null;
  wifi_fee: string | null;
  wifi_password: string | null;
  wheelchair: string | null;
  air_conditioning: string | null;
  outdoor_seating: string | null;
  indoor_seating: string | null;
  smoking: string | null;
  level: string | null;
  phone: string | null;
  website: string | null;
  fee: string | null;
  charge: string | null;
  reservation: string | null;
  capacity: string | null;
  brand: string | null;
  drinking_water: string | null;
  toilets: string | null;
  toilets_wheelchair: string | null;
  dog: string | null;
  osm_id: string | null;
  osm_tags: string | null;
  source: string;
  verified: number | boolean;
  verified_by: string | null;
  last_checked: string | null;
  last_synced: string | null;
  deleted_at: string | null;
}

interface StagingRow {
  osm_id: string;
  name: string;
  category: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  internet_access: string | null;
  sockets: string | null;
  opening_hours: string | null;
  laptop_status: string | null;
  laptop_conditional: string | null;
  wifi_ssid: string | null;
  wifi_fee: string | null;
  wifi_password: string | null;
  wheelchair: string | null;
  air_conditioning: string | null;
  outdoor_seating: string | null;
  indoor_seating: string | null;
  smoking: string | null;
  level: string | null;
  phone: string | null;
  website: string | null;
  fee: string | null;
  charge: string | null;
  reservation: string | null;
  capacity: string | null;
  brand: string | null;
  drinking_water: string | null;
  toilets: string | null;
  toilets_wheelchair: string | null;
  dog: string | null;
  osm_tags: string | null;
  fetched_at: string | null;
}

function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    internetAccess: (row.internet_access as Place['internetAccess']) ?? undefined,
    sockets: (row.sockets as Place['sockets']) ?? undefined,
    openingHours: row.opening_hours ?? undefined,
    laptopStatus: (row.laptop_status as Place['laptopStatus']) ?? undefined,
    laptopConditional: row.laptop_conditional ?? undefined,
    wifiSsid: row.wifi_ssid ?? undefined,
    wifiFee: (row.wifi_fee as Place['wifiFee']) ?? undefined,
    wifiPassword: (row.wifi_password as Place['wifiPassword']) ?? undefined,
    wheelchair: (row.wheelchair as Place['wheelchair']) ?? undefined,
    airConditioning: (row.air_conditioning as Place['airConditioning']) ?? undefined,
    outdoorSeating: (row.outdoor_seating as Place['outdoorSeating']) ?? undefined,
    indoorSeating: (row.indoor_seating as Place['indoorSeating']) ?? undefined,
    smoking: (row.smoking as Place['smoking']) ?? undefined,
    level: row.level ?? undefined,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    fee: (row.fee as Place['fee']) ?? undefined,
    charge: row.charge ?? undefined,
    reservation: (row.reservation as Place['reservation']) ?? undefined,
    capacity: row.capacity ?? undefined,
    brand: row.brand ?? undefined,
    drinkingWater: (row.drinking_water as Place['drinkingWater']) ?? undefined,
    toilets: (row.toilets as Place['toilets']) ?? undefined,
    toiletsWheelchair: (row.toilets_wheelchair as Place['toiletsWheelchair']) ?? undefined,
    dog: (row.dog as Place['dog']) ?? undefined,
    osmId: row.osm_id ?? undefined,
    osmTags: row.osm_tags ? JSON.parse(row.osm_tags) : undefined,
    source: row.source as Place['source'],
    verified: Boolean(row.verified),
    verifiedBy: row.verified_by ?? undefined,
    lastChecked: row.last_checked ?? undefined,
    lastSynced: row.last_synced ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function rowToStaged(row: StagingRow): StagedPlace {
  return {
    osmId: row.osm_id,
    name: row.name,
    category: row.category ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    internetAccess: (row.internet_access as StagedPlace['internetAccess']) ?? undefined,
    sockets: (row.sockets as StagedPlace['sockets']) ?? undefined,
    openingHours: row.opening_hours ?? undefined,
    laptopStatus: (row.laptop_status as StagedPlace['laptopStatus']) ?? undefined,
    laptopConditional: row.laptop_conditional ?? undefined,
    wifiSsid: row.wifi_ssid ?? undefined,
    wifiFee: (row.wifi_fee as StagedPlace['wifiFee']) ?? undefined,
    wifiPassword: (row.wifi_password as StagedPlace['wifiPassword']) ?? undefined,
    wheelchair: (row.wheelchair as StagedPlace['wheelchair']) ?? undefined,
    airConditioning: (row.air_conditioning as StagedPlace['airConditioning']) ?? undefined,
    outdoorSeating: (row.outdoor_seating as StagedPlace['outdoorSeating']) ?? undefined,
    indoorSeating: (row.indoor_seating as StagedPlace['indoorSeating']) ?? undefined,
    smoking: (row.smoking as StagedPlace['smoking']) ?? undefined,
    level: row.level ?? undefined,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    fee: (row.fee as StagedPlace['fee']) ?? undefined,
    charge: row.charge ?? undefined,
    reservation: (row.reservation as StagedPlace['reservation']) ?? undefined,
    capacity: row.capacity ?? undefined,
    brand: row.brand ?? undefined,
    drinkingWater: (row.drinking_water as StagedPlace['drinkingWater']) ?? undefined,
    toilets: (row.toilets as StagedPlace['toilets']) ?? undefined,
    toiletsWheelchair: (row.toilets_wheelchair as StagedPlace['toiletsWheelchair']) ?? undefined,
    dog: (row.dog as StagedPlace['dog']) ?? undefined,
    osmTags: row.osm_tags ? JSON.parse(row.osm_tags) : undefined,
  };
}

export async function getPlaces(
  db: Knex,
  filters?: {
    bbox?: BBox;
    city?: string;
    internetAccess?: boolean;
    sockets?: boolean;
    openNow?: boolean;
    includeDeleted?: boolean;
    onlyDeleted?: boolean;
  }
): Promise<Place[]> {
  const query = db<PlaceRow>('places');

  if (filters?.bbox) {
    query
      .whereBetween('latitude', [filters.bbox.minLat, filters.bbox.maxLat])
      .andWhereBetween('longitude', [filters.bbox.minLon, filters.bbox.maxLon]);
  }

  if (filters?.city) {
    query.andWhereRaw('LOWER(city) = LOWER(?)', [filters.city]);
  }

  if (filters?.onlyDeleted) {
    query.whereNotNull('deleted_at');
  } else if (!filters?.includeDeleted) {
    query.whereNull('deleted_at');
  }

  if (filters?.internetAccess) {
    query.andWhere('internet_access', 'in', ['yes', 'wired']);
  }

  if (filters?.sockets) {
    query.andWhere('sockets', 'in', ['yes', 'many']);
  }

  if (filters?.openNow) {
    query.whereNotNull('opening_hours');
  }

  const rows = await query;
  return rows.map(rowToPlace);
}

export async function insertPlace(db: Knex, place: Place): Promise<void> {
  await db<PlaceRow>('places').insert({
    id: place.id,
    name: place.name,
    category: place.category || null,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address || null,
    city: place.city || null,
    internet_access: place.internetAccess || null,
    sockets: place.sockets || null,
    opening_hours: place.openingHours || null,
    laptop_status: place.laptopStatus || null,
    laptop_conditional: place.laptopConditional || null,
    wifi_ssid: place.wifiSsid || null,
    wifi_fee: place.wifiFee || null,
    wifi_password: place.wifiPassword || null,
    wheelchair: place.wheelchair || null,
    air_conditioning: place.airConditioning || null,
    outdoor_seating: place.outdoorSeating || null,
    indoor_seating: place.indoorSeating || null,
    smoking: place.smoking || null,
    level: place.level || null,
    phone: place.phone || null,
    website: place.website || null,
    fee: place.fee || null,
    charge: place.charge || null,
    reservation: place.reservation || null,
    capacity: place.capacity || null,
    brand: place.brand || null,
    drinking_water: place.drinkingWater || null,
    toilets: place.toilets || null,
    toilets_wheelchair: place.toiletsWheelchair || null,
    dog: place.dog || null,
    osm_id: place.osmId || null,
    osm_tags: place.osmTags ? JSON.stringify(place.osmTags) : null,
    source: place.source,
    verified: place.verified,
    verified_by: place.verifiedBy || null,
    last_checked: place.lastChecked || null,
    last_synced: place.lastSynced || null,
  });
}

export async function updatePlace(
  db: Knex,
  id: string,
  updates: Partial<Omit<Place, 'deletedAt'>> & { deletedAt?: string | null }
): Promise<void> {
  const row: Partial<PlaceRow> = { updated_at: new Date().toISOString() } as Partial<PlaceRow>;

  if (updates.name !== undefined) row.name = updates.name;
  if (updates.category !== undefined) row.category = updates.category || null;
  if (updates.internetAccess !== undefined) row.internet_access = updates.internetAccess || null;
  if (updates.sockets !== undefined) row.sockets = updates.sockets || null;
  if (updates.openingHours !== undefined) row.opening_hours = updates.openingHours || null;
  if (updates.laptopStatus !== undefined) row.laptop_status = updates.laptopStatus || null;
  if (updates.laptopConditional !== undefined) {
    row.laptop_conditional = updates.laptopConditional || null;
  }
  if (updates.wifiSsid !== undefined) row.wifi_ssid = updates.wifiSsid || null;
  if (updates.wifiFee !== undefined) row.wifi_fee = updates.wifiFee || null;
  if (updates.wifiPassword !== undefined) row.wifi_password = updates.wifiPassword || null;
  if (updates.wheelchair !== undefined) row.wheelchair = updates.wheelchair || null;
  if (updates.airConditioning !== undefined) {
    row.air_conditioning = updates.airConditioning || null;
  }
  if (updates.outdoorSeating !== undefined) row.outdoor_seating = updates.outdoorSeating || null;
  if (updates.indoorSeating !== undefined) row.indoor_seating = updates.indoorSeating || null;
  if (updates.smoking !== undefined) row.smoking = updates.smoking || null;
  if (updates.level !== undefined) row.level = updates.level || null;
  if (updates.phone !== undefined) row.phone = updates.phone || null;
  if (updates.website !== undefined) row.website = updates.website || null;
  if (updates.fee !== undefined) row.fee = updates.fee || null;
  if (updates.charge !== undefined) row.charge = updates.charge || null;
  if (updates.reservation !== undefined) row.reservation = updates.reservation || null;
  if (updates.capacity !== undefined) row.capacity = updates.capacity || null;
  if (updates.brand !== undefined) row.brand = updates.brand || null;
  if (updates.drinkingWater !== undefined) row.drinking_water = updates.drinkingWater || null;
  if (updates.toilets !== undefined) row.toilets = updates.toilets || null;
  if (updates.toiletsWheelchair !== undefined) {
    row.toilets_wheelchair = updates.toiletsWheelchair || null;
  }
  if (updates.dog !== undefined) row.dog = updates.dog || null;
  if (updates.verified !== undefined) row.verified = updates.verified as unknown as number;
  if (updates.address !== undefined) row.address = updates.address || null;
  if (updates.city !== undefined) row.city = updates.city || null;
  if (updates.osmTags !== undefined) {
    row.osm_tags = updates.osmTags ? JSON.stringify(updates.osmTags) : null;
  }
  if (updates.lastSynced !== undefined) row.last_synced = updates.lastSynced || null;
  if (updates.deletedAt !== undefined) row.deleted_at = updates.deletedAt;

  await db<PlaceRow>('places').where({ id }).update(row);
}

export async function deletePlace(db: Knex, id: string): Promise<void> {
  await db<PlaceRow>('places').where({ id }).delete();
}

export async function getAllPlaces(db: Knex): Promise<Place[]> {
  const rows = await db<PlaceRow>('places').select('*');
  return rows.map(rowToPlace);
}

export async function getDistinctCities(db: Knex): Promise<string[]> {
  const rows = await db<PlaceRow>('places')
    .distinct('city')
    .whereNotNull('city')
    .whereNull('deleted_at')
    .orderBy('city');
  return rows.map((r) => r.city as string);
}

export async function clearPlaces(db: Knex): Promise<void> {
  await db<PlaceRow>('places').delete();
}

export async function clearStaging(db: Knex): Promise<void> {
  await db<StagingRow>('osm_staging').delete();
}

export async function insertStaged(
  db: Knex,
  staged: StagedPlace,
  fetchedAt: string
): Promise<void> {
  await db<StagingRow>('osm_staging').insert({
    osm_id: staged.osmId,
    name: staged.name,
    category: staged.category || null,
    latitude: staged.latitude,
    longitude: staged.longitude,
    address: staged.address || null,
    city: staged.city || null,
    internet_access: staged.internetAccess || null,
    sockets: staged.sockets || null,
    opening_hours: staged.openingHours || null,
    laptop_status: staged.laptopStatus || null,
    laptop_conditional: staged.laptopConditional || null,
    wifi_ssid: staged.wifiSsid || null,
    wifi_fee: staged.wifiFee || null,
    wifi_password: staged.wifiPassword || null,
    wheelchair: staged.wheelchair || null,
    air_conditioning: staged.airConditioning || null,
    outdoor_seating: staged.outdoorSeating || null,
    indoor_seating: staged.indoorSeating || null,
    smoking: staged.smoking || null,
    level: staged.level || null,
    phone: staged.phone || null,
    website: staged.website || null,
    fee: staged.fee || null,
    charge: staged.charge || null,
    reservation: staged.reservation || null,
    capacity: staged.capacity || null,
    brand: staged.brand || null,
    drinking_water: staged.drinkingWater || null,
    toilets: staged.toilets || null,
    toilets_wheelchair: staged.toiletsWheelchair || null,
    dog: staged.dog || null,
    osm_tags: staged.osmTags ? JSON.stringify(staged.osmTags) : null,
    fetched_at: fetchedAt,
  });
}

export async function getAllStaged(db: Knex): Promise<StagedPlace[]> {
  const rows = await db<StagingRow>('osm_staging').select('*');
  return rows.map(rowToStaged);
}

export async function getPlaceByOsmId(db: Knex, osmId: string): Promise<Place | null> {
  const row = await db<PlaceRow>('places').where({ osm_id: osmId }).first();
  return row ? rowToPlace(row) : null;
}

export async function getPlaceById(db: Knex, id: string): Promise<Place | null> {
  const row = await db<PlaceRow>('places').where({ id }).first();
  return row ? rowToPlace(row) : null;
}

/**
 * Soft-deletes every osm-sourced place whose osm_id is not present in
 * `activeOsmIds` and that isn't already marked as deleted.
 * Returns the ids of places that were newly soft-deleted.
 */
interface TransitStopRow {
  id: string;
  osm_id: string;
  kind: string;
  name: string | null;
  latitude: number;
  longitude: number;
  capacity: string | null;
  covered: string | null;
  last_synced: string | null;
}

function rowToTransitStop(row: TransitStopRow): TransitStop {
  return {
    id: row.id,
    osmId: row.osm_id,
    kind: row.kind as TransitStop['kind'],
    name: row.name ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    capacity: row.capacity ?? undefined,
    covered: row.covered ?? undefined,
    lastSynced: row.last_synced ?? undefined,
  };
}

export async function upsertTransitStop(
  db: Knex,
  stop: TransitStop,
  syncedAt: string
): Promise<void> {
  await db<TransitStopRow>('transit_stops')
    .insert({
      id: stop.id,
      osm_id: stop.osmId,
      kind: stop.kind,
      name: stop.name || null,
      latitude: stop.latitude,
      longitude: stop.longitude,
      capacity: stop.capacity || null,
      covered: stop.covered || null,
      last_synced: syncedAt,
    })
    .onConflict('id')
    .merge();
}

const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_DEGREE_LAT = 111320;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Hard-deletes every transit stop whose id is not present in `validIds`.
 * Only meaningful for a full-region sync — a partial run doesn't represent
 * the full OSM universe, so absence doesn't mean removal. Returns the count
 * of pruned rows.
 */
export async function pruneTransitStops(db: Knex, validIds: Set<string>): Promise<number> {
  const existingIds = await db<TransitStopRow>('transit_stops').pluck('id');
  const staleIds = existingIds.filter((id) => !validIds.has(id));

  await db.transaction(async (trx) => {
    for (const id of staleIds) {
      await trx<TransitStopRow>('transit_stops').where({ id }).delete();
    }
  });

  return staleIds.length;
}

export async function getNearbyTransitStops(
  db: Knex,
  lat: number,
  lon: number,
  radiusMeters: number,
  limit = 30
): Promise<TransitStopWithDistance[]> {
  const deltaLat = radiusMeters / METERS_PER_DEGREE_LAT;
  const deltaLon = radiusMeters / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));

  const rows = await db<TransitStopRow>('transit_stops')
    .whereBetween('latitude', [lat - deltaLat, lat + deltaLat])
    .andWhereBetween('longitude', [lon - deltaLon, lon + deltaLon]);

  return rows
    .map((row) => {
      const stop = rowToTransitStop(row);
      return { ...stop, distanceMeters: haversineMeters(lat, lon, stop.latitude, stop.longitude) };
    })
    .filter((stop) => stop.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);
}

interface PlaceCandidateRow {
  id: string;
  osm_id: string;
  name: string;
  category: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  internet_access: string | null;
  sockets: string | null;
  osm_tags: string | null;
  last_synced: string | null;
}

function rowToCandidate(row: PlaceCandidateRow): PlaceCandidate {
  return {
    id: row.id,
    osmId: row.osm_id,
    name: row.name,
    category: row.category ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    internetAccess: (row.internet_access as PlaceCandidate['internetAccess']) ?? undefined,
    sockets: (row.sockets as PlaceCandidate['sockets']) ?? undefined,
    osmTags: row.osm_tags ? JSON.parse(row.osm_tags) : undefined,
    lastSynced: row.last_synced ?? undefined,
  };
}

export async function upsertPlaceCandidate(
  db: Knex,
  candidate: PlaceCandidate,
  syncedAt: string
): Promise<void> {
  await db<PlaceCandidateRow>('place_candidates')
    .insert({
      id: candidate.id,
      osm_id: candidate.osmId,
      name: candidate.name,
      category: candidate.category || null,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      address: candidate.address || null,
      city: candidate.city || null,
      internet_access: candidate.internetAccess || null,
      sockets: candidate.sockets || null,
      osm_tags: candidate.osmTags ? JSON.stringify(candidate.osmTags) : null,
      last_synced: syncedAt,
    })
    .onConflict('id')
    .merge();
}

export async function getPlaceCandidates(db: Knex, bbox: BBox): Promise<PlaceCandidate[]> {
  const rows = await db<PlaceCandidateRow>('place_candidates')
    .whereBetween('latitude', [bbox.minLat, bbox.maxLat])
    .andWhereBetween('longitude', [bbox.minLon, bbox.maxLon]);
  return rows.map(rowToCandidate);
}

export async function getPlaceCandidateById(db: Knex, id: string): Promise<PlaceCandidate | null> {
  const row = await db<PlaceCandidateRow>('place_candidates').where({ id }).first();
  return row ? rowToCandidate(row) : null;
}

/** Same pruning logic as {@link pruneTransitStops}, for place_candidates. */
export async function prunePlaceCandidates(db: Knex, validIds: Set<string>): Promise<number> {
  const existingIds = await db<PlaceCandidateRow>('place_candidates').pluck('id');
  const staleIds = existingIds.filter((id) => !validIds.has(id));

  await db.transaction(async (trx) => {
    for (const id of staleIds) {
      await trx<PlaceCandidateRow>('place_candidates').where({ id }).delete();
    }
  });

  return staleIds.length;
}

export async function softDeleteMissingOsmPlaces(
  db: Knex,
  activeOsmIds: string[],
  deletedAt: string
): Promise<string[]> {
  const candidates = await db<PlaceRow>('places')
    .select('id', 'osm_id')
    .where({ source: 'osm' })
    .whereNull('deleted_at');

  const activeSet = new Set(activeOsmIds);
  const toDelete = candidates.filter((c) => !c.osm_id || !activeSet.has(c.osm_id));

  for (const place of toDelete) {
    await updatePlace(db, place.id, { deletedAt });
  }

  return toDelete.map((p) => p.id);
}
