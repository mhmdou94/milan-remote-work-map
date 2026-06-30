import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    table.string('laptop_conditional');
    table.string('wifi_ssid');
    table.string('wifi_fee');
    table.string('wifi_password');
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    table.string('laptop_conditional');
    table.string('wifi_ssid');
    table.string('wifi_fee');
    table.string('wifi_password');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('places', (table) => {
    table.dropColumn('laptop_conditional');
    table.dropColumn('wifi_ssid');
    table.dropColumn('wifi_fee');
    table.dropColumn('wifi_password');
  });

  await knex.schema.alterTable('osm_staging', (table) => {
    table.dropColumn('laptop_conditional');
    table.dropColumn('wifi_ssid');
    table.dropColumn('wifi_fee');
    table.dropColumn('wifi_password');
  });
}
