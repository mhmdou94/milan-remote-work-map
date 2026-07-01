import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('place_candidates', (table) => {
    table.string('id').primary();
    table.string('osm_id').notNullable();
    table.string('name').notNullable();
    table.string('category');
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.string('address');
    table.string('city');
    table.string('internet_access');
    table.string('sockets');
    table.text('osm_tags');
    table.string('last_synced');

    table.index(['latitude', 'longitude'], 'idx_candidates_bbox');
    table.index('osm_id', 'idx_candidates_osm_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('place_candidates');
}
