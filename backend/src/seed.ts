import { Knex } from 'knex';
import { initDb, closeDb } from './db/init.js';
import { insertPlace } from './db/queries.js';
import type { Place } from './types.js';

export const SEED_PLACES: Place[] = [
  {
    id: 'test-1',
    name: 'Caffè Nero',
    category: 'cafe',
    latitude: 45.4642,
    longitude: 9.19,
    address: 'Via Torino, 20100 Milano',
    city: 'Milano',
    internetAccess: 'yes',
    sockets: 'yes',
    openingHours: 'Mo-Su 07:00-22:00',
    wifiSsid: 'CaffeNero-Guest',
    wifiFee: 'no',
    wifiPassword: 'yes',
    osmId: 'node/123456',
    osmTags: { name: 'Caffè Nero', amenity: 'cafe' },
    source: 'manual',
    verified: true,
    lastSynced: new Date().toISOString(),
  },
  {
    id: 'test-2',
    name: 'Biblioteca Ambrosiana',
    category: 'library',
    latitude: 45.4628,
    longitude: 9.2042,
    address: 'Via Ambrosini, 10 Milano',
    city: 'Milano',
    internetAccess: 'yes',
    sockets: 'no',
    openingHours: 'Mo-Fr 10:00-18:00; Sa 10:00-16:00',
    osmId: 'node/234567',
    osmTags: { name: 'Biblioteca Ambrosiana', amenity: 'library' },
    source: 'manual',
    verified: true,
    lastSynced: new Date().toISOString(),
  },
  {
    id: 'test-3',
    name: 'Coworking Space Milano',
    category: 'coworking',
    latitude: 45.4715,
    longitude: 9.2008,
    address: 'Via Santa Radegonda, 16 Milano',
    city: 'Milano',
    internetAccess: 'yes',
    sockets: 'many',
    openingHours: 'Mo-Su 06:00-23:00',
    osmId: 'way/345678',
    osmTags: { name: 'Coworking Space Milano', office: 'coworking' },
    source: 'manual',
    verified: true,
    lastSynced: new Date().toISOString(),
  },
  {
    id: 'test-4',
    name: 'Ristorante Alla Scala',
    category: 'restaurant',
    latitude: 45.4742,
    longitude: 9.1917,
    address: 'Piazza della Scala, 20121 Milano',
    city: 'Milano',
    internetAccess: 'yes',
    sockets: 'yes',
    openingHours: 'Tu-Su 12:00-15:00; 19:00-23:00',
    laptopConditional: 'no @ (12:00-15:00,19:00-23:00)',
    osmId: 'node/456789',
    osmTags: { name: 'Ristorante Alla Scala', amenity: 'restaurant' },
    source: 'manual',
    verified: true,
    lastSynced: new Date().toISOString(),
  },
  {
    id: 'test-5',
    name: 'Milano Coffee Lab',
    category: 'cafe',
    latitude: 45.459,
    longitude: 9.198,
    address: 'Via San Raffaele, 6 Milano',
    city: 'Milano',
    internetAccess: 'yes',
    sockets: 'yes',
    openingHours: 'Mo-Sa 07:30-19:30; Su 08:00-19:00',
    osmId: 'node/567890',
    osmTags: { name: 'Milano Coffee Lab', amenity: 'cafe' },
    source: 'manual',
    verified: true,
    lastSynced: new Date().toISOString(),
  },
];

export async function seedDb(db: Knex): Promise<void> {
  for (const place of SEED_PLACES) {
    await insertPlace(db, place);
  }
}

async function main(): Promise<void> {
  const db = await initDb();

  try {
    console.log('\n🌱 Seeding test data...\n');

    console.log(`📝 Inserting ${SEED_PLACES.length} test places...`);
    for (const place of SEED_PLACES) {
      await insertPlace(db, place);
      console.log(`  ✓ ${place.name}`);
    }

    await closeDb(db);

    console.log(`\n✅ Seed complete! ${SEED_PLACES.length} test places in database`);
    console.log(`📍 Test API: http://localhost:3000/api/places?bbox=45.3,9.0,45.6,9.4\n`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
