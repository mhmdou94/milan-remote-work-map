import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    table.string('city');
    table.index('city', 'idx_city');
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    table.string('city');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    table.dropColumn('city');
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    table.dropColumn('city');
  });
}
