import type { Knex } from 'knex';

const COLUMNS = [
  'wheelchair',
  'air_conditioning',
  'outdoor_seating',
  'indoor_seating',
  'smoking',
  'level',
  'phone',
  'website',
  'fee',
  'charge',
  'reservation',
  'capacity',
  'brand',
  'drinking_water',
  'toilets',
  'toilets_wheelchair',
  'dog',
] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    for (const column of COLUMNS) table.string(column);
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    for (const column of COLUMNS) table.string(column);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    for (const column of COLUMNS) table.dropColumn(column);
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    for (const column of COLUMNS) table.dropColumn(column);
  });
}
