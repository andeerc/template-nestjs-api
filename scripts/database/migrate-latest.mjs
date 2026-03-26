import knex from 'knex';
import { createKnexConfig } from './shared-config.mjs';

const db = knex(createKnexConfig());

try {
  const [batchNumber, migratedMigrations] = await db.migrate.latest();

  if (migratedMigrations.length === 0) {
    console.log('Database is already up to date.');
  } else {
    console.log(`Applied migration batch ${batchNumber}:`);
    migratedMigrations.forEach((migrationName) => {
      console.log(`- ${migrationName}`);
    });
  }
} finally {
  await db.destroy();
}
