import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, '../../data');
const dbPath = path.join(dbDir, 'places.sqlite');

let sqlJs: any = null;

async function initSql() {
  if (!sqlJs) {
    sqlJs = await initSqlJs();
  }
  return sqlJs;
}

export async function initDb(): Promise<SqlJsDatabase> {
  const SQL = await initSql();

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load existing DB or create new
  let db: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,

      internet_access TEXT,
      sockets TEXT,
      opening_hours TEXT,

      osm_id TEXT,
      osm_tags TEXT,
      source TEXT DEFAULT 'osm',
      verified INTEGER DEFAULT 0,
      verified_by TEXT,
      last_checked TEXT,
      last_synced TEXT,

      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bbox ON places(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_category ON places(category);
    CREATE INDEX IF NOT EXISTS idx_source ON places(source);
  `);

  return db;
}

export function closeDb(db: SqlJsDatabase): void {
  // Save to disk
  const data = db.export();
  const buffer = Buffer.from(data);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  fs.writeFileSync(dbPath, buffer);
}
