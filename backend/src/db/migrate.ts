import { initDb, closeDb } from './init.js';

async function main(): Promise<void> {
  const db = await initDb();
  console.log('✅ Migrations applied');
  await closeDb(db);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
