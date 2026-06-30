import { Knex } from 'knex';
import { Place, BBox, StagedPlace } from '../types.js';

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
  laptop_conditional: string | null;
  wifi_ssid: string | null;
  wifi_fee: string | null;
  wifi_password: string | null;
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
  laptop_conditional: string | null;
  wifi_ssid: string | null;
  wifi_fee: string | null;
  wifi_password: string | null;
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
    laptopConditional: row.laptop_conditional ?? undefined,
    wifiSsid: row.wifi_ssid ?? undefined,
    wifiFee: (row.wifi_fee as Place['wifiFee']) ?? undefined,
    wifiPassword: (row.wifi_password as Place['wifiPassword']) ?? undefined,
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
    laptopConditional: row.laptop_conditional ?? undefined,
    wifiSsid: row.wifi_ssid ?? undefined,
    wifiFee: (row.wifi_fee as StagedPlace['wifiFee']) ?? undefined,
    wifiPassword: (row.wifi_password as StagedPlace['wifiPassword']) ?? undefined,
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
    query.andWhere('internet_access', 'yes');
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
    laptop_conditional: place.laptopConditional || null,
    wifi_ssid: place.wifiSsid || null,
    wifi_fee: place.wifiFee || null,
    wifi_password: place.wifiPassword || null,
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
  if (updates.laptopConditional !== undefined) {
    row.laptop_conditional = updates.laptopConditional || null;
  }
  if (updates.wifiSsid !== undefined) row.wifi_ssid = updates.wifiSsid || null;
  if (updates.wifiFee !== undefined) row.wifi_fee = updates.wifiFee || null;
  if (updates.wifiPassword !== undefined) row.wifi_password = updates.wifiPassword || null;
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
    laptop_conditional: staged.laptopConditional || null,
    wifi_ssid: staged.wifiSsid || null,
    wifi_fee: staged.wifiFee || null,
    wifi_password: staged.wifiPassword || null,
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

/**
 * Soft-deletes every osm-sourced place whose osm_id is not present in
 * `activeOsmIds` and that isn't already marked as deleted.
 * Returns the ids of places that were newly soft-deleted.
 */
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
