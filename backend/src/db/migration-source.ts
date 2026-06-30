import fs from 'fs';
import path from 'path';
import type { Knex } from 'knex';

// Knex's built-in directory-based migration source records the filename
// (including extension) as the migration name. Dev runs migrations straight
// from .ts via tsx, while production runs the tsc-compiled .js output, so
// the same migration would be recorded under two different names depending
// on environment. Stripping the extension here keeps the recorded name
// (and therefore the migrations table) identical across environments.
export function createMigrationSource(
  directory: string,
  extension: string
): Knex.MigrationSource<string> {
  return {
    async getMigrations() {
      return fs
        .readdirSync(directory)
        .filter((file) => file.endsWith(extension))
        .sort();
    },
    getMigrationName(migration: string) {
      return path.basename(migration, path.extname(migration));
    },
    async getMigration(migration: string) {
      return import(path.join(directory, migration));
    },
  };
}
