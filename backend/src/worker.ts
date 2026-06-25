import { initDb, closeDb } from './db/init.js';
import { fetchFromOverpass } from './worker/overpass.js';
import { clearPlaces, insertPlace } from './db/queries.js';

async function syncPlaces(): Promise<void> {
  const db = await initDb();

  try {
    console.log('\n🔄 Starting place sync from OSM...\n');

    console.log('📥 Fetching places from Overpass API...');
    const places = await fetchFromOverpass();

    console.log(`\n🗑️  Clearing old places from database...`);
    clearPlaces(db);

    console.log(`📝 Inserting ${places.length} new places...`);
    let count = 0;
    for (const place of places) {
      insertPlace(db, place);
      count++;
      if (count % 10 === 0) {
        console.log(`  → ${count}/${places.length}`);
      }
    }

    console.log(`\n💾 Saving database...`);
    closeDb(db);

    console.log(`\n✅ Sync complete! ${places.length} places in database`);
    console.log(`📍 API ready: http://localhost:3000/api/places?bbox=45.3,9.0,45.6,9.4\n`);
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

syncPlaces();
