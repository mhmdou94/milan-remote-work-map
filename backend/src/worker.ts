import { initDb, closeDb } from './db/init.js';
import { downloadPbf } from './worker/download.js';
import { extractPlacesFromPbf } from './worker/pbf.js';
import { extractTransitFromPbf } from './worker/transit.js';
import { extractCandidatesFromPbf } from './worker/candidates.js';
import { resolveActiveRegions, PBF_REGIONS } from './worker/regions.js';
import {
  clearStaging,
  insertStaged,
  getAllStaged,
  getPlaceByOsmId,
  insertPlace,
  updatePlace,
  softDeleteMissingOsmPlaces,
  upsertTransitStop,
  upsertPlaceCandidate,
  pruneTransitStops,
  prunePlaceCandidates,
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
    city: place.city,
    internetAccess: place.internetAccess,
    sockets: place.sockets,
    openingHours: place.openingHours,
    laptopStatus: place.laptopStatus,
    laptopConditional: place.laptopConditional,
    wifiSsid: place.wifiSsid,
    wifiFee: place.wifiFee,
    wifiPassword: place.wifiPassword,
    wheelchair: place.wheelchair,
    airConditioning: place.airConditioning,
    outdoorSeating: place.outdoorSeating,
    indoorSeating: place.indoorSeating,
    smoking: place.smoking,
    level: place.level,
    phone: place.phone,
    website: place.website,
    fee: place.fee,
    charge: place.charge,
    reservation: place.reservation,
    capacity: place.capacity,
    brand: place.brand,
    drinkingWater: place.drinkingWater,
    toilets: place.toilets,
    toiletsWheelchair: place.toiletsWheelchair,
    dog: place.dog,
    osmTags: place.osmTags,
  };
}

async function syncPlaces(): Promise<void> {
  const db = await initDb();

  try {
    console.log('\n🔄 Starting place sync from Geofabrik PBF extracts...\n');

    const activeRegions = resolveActiveRegions(process.env.PBF_REGIONS);
    const now = new Date().toISOString();

    await clearStaging(db);

    let totalFetched = 0;
    const seenTransitIds = new Set<string>();
    const seenCandidateIds = new Set<string>();

    for (const region of activeRegions) {
      console.log(`\n📍 Region: ${region.name}`);
      const pbfPath = await downloadPbf(region);

      console.log(`  🔍 Extracting laptop=yes/no/restricted places with osmium...`);
      const fetched = await extractPlacesFromPbf(pbfPath);
      console.log(`  📦 Staging ${fetched.length} places from ${region.name}...`);

      for (const place of fetched) {
        if (!place.osmId) continue;
        await insertStaged(db, toStagedPlace(place), now);
      }
      totalFetched += fetched.length;

      console.log(`  🚌 Extracting transit stops & bike parking with osmium...`);
      const transitStops = await extractTransitFromPbf(pbfPath);
      console.log(`  📦 Upserting ${transitStops.length} transit stops from ${region.name}...`);
      await db.transaction(async (trx) => {
        for (const stop of transitStops) {
          await upsertTransitStop(trx, stop, now);
          seenTransitIds.add(stop.id);
        }
      });

      console.log(`  💡 Extracting candidate places with osmium...`);
      const candidates = await extractCandidatesFromPbf(pbfPath);
      console.log(`  📦 Upserting ${candidates.length} candidates from ${region.name}...`);
      await db.transaction(async (trx) => {
        for (const candidate of candidates) {
          await upsertPlaceCandidate(trx, candidate, now);
          seenCandidateIds.add(candidate.id);
        }
      });
    }

    const staged = await getAllStaged(db);

    console.log(`\n🔀 Reconciling ${staged.length} staged places with the database...`);
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
          city: stagedPlace.city,
          internetAccess: stagedPlace.internetAccess,
          sockets: stagedPlace.sockets,
          openingHours: stagedPlace.openingHours,
          laptopStatus: stagedPlace.laptopStatus,
          laptopConditional: stagedPlace.laptopConditional,
          wifiSsid: stagedPlace.wifiSsid,
          wifiFee: stagedPlace.wifiFee,
          wifiPassword: stagedPlace.wifiPassword,
          wheelchair: stagedPlace.wheelchair,
          airConditioning: stagedPlace.airConditioning,
          outdoorSeating: stagedPlace.outdoorSeating,
          indoorSeating: stagedPlace.indoorSeating,
          smoking: stagedPlace.smoking,
          level: stagedPlace.level,
          phone: stagedPlace.phone,
          website: stagedPlace.website,
          fee: stagedPlace.fee,
          charge: stagedPlace.charge,
          reservation: stagedPlace.reservation,
          capacity: stagedPlace.capacity,
          brand: stagedPlace.brand,
          drinkingWater: stagedPlace.drinkingWater,
          toilets: stagedPlace.toilets,
          toiletsWheelchair: stagedPlace.toiletsWheelchair,
          dog: stagedPlace.dog,
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
        laptopStatus: stagedPlace.laptopStatus,
        address: stagedPlace.address,
        city: stagedPlace.city,
        wheelchair: stagedPlace.wheelchair,
        airConditioning: stagedPlace.airConditioning,
        outdoorSeating: stagedPlace.outdoorSeating,
        indoorSeating: stagedPlace.indoorSeating,
        smoking: stagedPlace.smoking,
        level: stagedPlace.level,
        phone: stagedPlace.phone,
        website: stagedPlace.website,
        fee: stagedPlace.fee,
        charge: stagedPlace.charge,
        reservation: stagedPlace.reservation,
        capacity: stagedPlace.capacity,
        brand: stagedPlace.brand,
        drinkingWater: stagedPlace.drinkingWater,
        toilets: stagedPlace.toilets,
        toiletsWheelchair: stagedPlace.toiletsWheelchair,
        dog: stagedPlace.dog,
        osmTags: stagedPlace.osmTags,
        lastSynced: now,
        deletedAt: null,
      });
      updated++;
    }

    let removedCount = 0;
    let prunedTransitCount = 0;
    let prunedCandidateCount = 0;
    if (activeRegions.length === PBF_REGIONS.length) {
      console.log(`\n🗑️  Soft-deleting places no longer tagged with a laptop status in OSM...`);
      const removedIds = await softDeleteMissingOsmPlaces(
        db,
        staged.map((s) => s.osmId),
        now
      );
      removedCount = removedIds.length;

      console.log(`\n🗑️  Pruning transit stops & candidates no longer present in OSM...`);
      prunedTransitCount = await pruneTransitStops(db, seenTransitIds);
      prunedCandidateCount = await prunePlaceCandidates(db, seenCandidateIds);
    } else {
      console.log(
        `\n⚠️  Skipping soft-delete & pruning: partial region sync (${activeRegions.map((r) => r.name).join(', ')}) ` +
          `doesn't cover the full OSM universe, so missing places elsewhere don't mean they were removed.`
      );
    }

    await closeDb(db);

    console.log(`\n✅ Sync complete!`);
    console.log(
      `   ${inserted} new, ${updated} updated (${restored} restored), ${removedCount} soft-deleted (${totalFetched} fetched)`
    );
    console.log(
      `   ${prunedTransitCount} stale transit stops pruned, ${prunedCandidateCount} stale candidates pruned`
    );
    console.log(`📍 API ready: http://localhost:3000/api/places?bbox=45.3,9.0,45.6,9.4\n`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncPlaces();
