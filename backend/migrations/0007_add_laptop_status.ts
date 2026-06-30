import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    table.string('laptop_status').defaultTo('yes');
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    table.string('laptop_status').defaultTo('yes');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    table.dropColumn('laptop_status');
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    table.dropColumn('laptop_status');
  });
}
