import { initDb, closeDb } from './db/init.js';
import { fetchFromOverpass } from './worker/overpass.js';
import { clearPlaces, insertPlace } from './db/queries.js';

async function syncPlaces(): Promise<void> {
  const db = await initDb();

  try {
    console.log('🔄 Starting place sync from OSM...');
    const places = await fetchFromOverpass();

    console.log(`Clearing old places from database...`);
    clearPlaces(db);

    console.log(`Inserting ${places.length} new places...`);
    for (const place of places) {
      insertPlace(db, place);
    }

    console.log(`✅ Sync complete: ${places.length} places in database`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  } finally {
    closeDb(db);
  }
}

syncPlaces();
