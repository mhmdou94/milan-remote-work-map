import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transit_stops', (table) => {
    table.string('id').primary();
    table.string('osm_id').notNullable();
    table.string('kind').notNullable();
    table.string('name');
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.string('capacity');
    table.string('covered');
    table.string('last_synced');

    table.index(['latitude', 'longitude'], 'idx_transit_bbox');
    table.index('osm_id', 'idx_transit_osm_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transit_stops');
}
