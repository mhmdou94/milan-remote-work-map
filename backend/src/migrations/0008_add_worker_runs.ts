import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('worker_runs', (table) => {
    table.increments('id').primary();
    table.string('started_at').notNullable();
    table.string('completed_at').nullable();
    table.string('status').notNullable(); // 'running' | 'success' | 'failed'
    table.string('error').nullable();
    table.integer('places_fetched').nullable();
    table.integer('inserted').nullable();
    table.integer('updated').nullable();
    table.integer('restored').nullable();
    table.integer('deleted').nullable();
    table.integer('transit_pruned').nullable();
    table.integer('candidates_pruned').nullable();
  });

  await knex.schema.createTable('worker_run_regions', (table) => {
    table.increments('id').primary();
    table.integer('run_id').notNullable().references('id').inTable('worker_runs');
    table.string('region_name').notNullable();
    table.string('started_at').notNullable();
    table.string('completed_at').nullable();
    table.integer('places_fetched').nullable();
    table.integer('transit_stops').nullable();
    table.integer('candidates').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('worker_run_regions');
  await knex.schema.dropTable('worker_runs');
}
