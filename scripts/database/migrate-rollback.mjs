import knex from 'knex';
import { createKnexConfig } from './shared-config.mjs';

const db = knex(createKnexConfig());

try {
  const [batchNumber, rolledBackMigrations] = await db.migrate.rollback();

  if (rolledBackMigrations.length === 0) {
    console.log('No migration batch was rolled back.');
  } else {
    console.log(`Rolled back migration batch ${batchNumber}:`);
    rolledBackMigrations.forEach((migrationName) => {
      console.log(`- ${migrationName}`);
    });
  }
} finally {
  await db.destroy();
}
