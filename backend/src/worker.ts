import { initDb, closeDb } from './db/init.js';
import { fetchFromOverpass } from './worker/overpass.js';
import {
  clearStaging,
  insertStaged,
  getAllStaged,
  getPlaceByOsmId,
  insertPlace,
  updatePlace,
  softDeleteMissingOsmPlaces,
} from './db/queries.js';
import type { Place, StagedPlace } from './types.js';

function toStagedPlace(place: Place): StagedPlace {
  return {
    osmId: place.osmId!,
    name: place.name,
    category: place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
    internetAccess: place.internetAccess,
    sockets: place.sockets,
    openingHours: place.openingHours,
    osmTags: place.osmTags,
  };
}

async function syncPlaces(): Promise<void> {
  const db = await initDb();

  try {
    console.log('\n🔄 Starting place sync from OSM...\n');

    console.log('📥 Fetching places from Overpass API...');
    const fetched = await fetchFromOverpass();
    const now = new Date().toISOString();

    console.log(`\n📦 Staging ${fetched.length} fetched places...`);
    await clearStaging(db);
    for (const place of fetched) {
      if (!place.osmId) continue;
      await insertStaged(db, toStagedPlace(place), now);
    }

    const staged = await getAllStaged(db);

    console.log(`\n🔀 Reconciling staged places with the database...`);
    let inserted = 0;
    let updated = 0;
    let restored = 0;

    for (const stagedPlace of staged) {
      const existing = await getPlaceByOsmId(db, stagedPlace.osmId);

      if (!existing) {
        await insertPlace(db, {
          id: `osm-${stagedPlace.osmId.replace('/', '-')}`,
          name: stagedPlace.name,
          category: stagedPlace.category,
          latitude: stagedPlace.latitude,
          longitude: stagedPlace.longitude,
          address: stagedPlace.address,
          internetAccess: stagedPlace.internetAccess,
          sockets: stagedPlace.sockets,
          openingHours: stagedPlace.openingHours,
          osmId: stagedPlace.osmId,
          osmTags: stagedPlace.osmTags,
          source: 'osm',
          verified: false,
          lastSynced: now,
        });
        inserted++;
        continue;
      }

      if (existing.deletedAt) restored++;

      await updatePlace(db, existing.id, {
        name: stagedPlace.name,
        category: stagedPlace.category,
        internetAccess: stagedPlace.internetAccess,
        sockets: stagedPlace.sockets,
        openingHours: stagedPlace.openingHours,
        address: stagedPlace.address,
        osmTags: stagedPlace.osmTags,
        lastSynced: now,
        deletedAt: null,
      });
      updated++;
    }

    console.log(`\n🗑️  Soft-deleting places no longer tagged laptop=yes in OSM...`);
    const removedIds = await softDeleteMissingOsmPlaces(
      db,
      staged.map((s) => s.osmId),
      now
    );

    await closeDb(db);

    console.log(`\n✅ Sync complete!`);
    console.log(
      `   ${inserted} new, ${updated} updated (${restored} restored), ${removedIds.length} soft-deleted`
    );
    console.log(`📍 API ready: http://localhost:3000/api/places?bbox=45.3,9.0,45.6,9.4\n`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncPlaces();
