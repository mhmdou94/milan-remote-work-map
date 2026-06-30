import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('places', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('category');
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.string('address');

    table.string('internet_access');
    table.string('sockets');
    table.string('opening_hours');

    table.string('osm_id');
    table.text('osm_tags');
    table.string('source').defaultTo('osm');
    table.boolean('verified').defaultTo(false);
    table.string('verified_by');
    table.string('last_checked');
    table.string('last_synced');
    table.string('deleted_at');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['latitude', 'longitude'], 'idx_bbox');
    table.index('category', 'idx_category');
    table.index('source', 'idx_source');
    table.index('osm_id', 'idx_osm_id');
    table.index('deleted_at', 'idx_deleted_at');
  });

  // Holds the raw result of the latest Overpass fetch so the worker can diff
  // it against the places table. Truncated and refilled on every sync run.
  await knex.schema.createTable('osm_staging', (table) => {
    table.string('osm_id').primary();
    table.string('name').notNullable();
    table.string('category');
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.string('address');
    table.string('internet_access');
    table.string('sockets');
    table.string('opening_hours');
    table.text('osm_tags');
    table.string('fetched_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('osm_staging');
  await knex.schema.dropTableIfExists('places');
}
