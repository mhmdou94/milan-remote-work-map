import knexFactory, { Knex } from 'knex';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createMigrationSource } from './migration-source.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/places.sqlite');
const migrationsDir = path.join(__dirname, '../migrations');

// This file runs as src/db/init.ts under tsx in dev and as dist/db/init.js
// once compiled, so its own extension tells us which sibling migrations
// (src/migrations/*.ts vs dist/migrations/*.js) to load.
const migrationsExtension = path.extname(fileURLToPath(import.meta.url));

let db: Knex | null = null;
let migrated: Promise<void> | null = null;

function createKnex(): Knex {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return knexFactory({
    client: 'better-sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
    migrations: {
      migrationSource: createMigrationSource(migrationsDir, migrationsExtension),
    },
  });
}

export async function initDb(): Promise<Knex> {
  if (!db) {
    db = createKnex();
  }

  // Migrations are idempotent and cheap to check, so just run them on every
  // connect instead of requiring a separate `npm run migrate` step in dev.
  if (!migrated) {
    migrated = db.migrate.latest().then(() => undefined);
  }
  await migrated;

  return db;
}

export async function closeDb(connection: Knex): Promise<void> {
  await connection.destroy();
  if (db === connection) {
    db = null;
    migrated = null;
  }
}
