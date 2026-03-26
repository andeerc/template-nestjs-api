import knex from 'knex';
import { createKnexConfig } from './shared-config.mjs';

const db = knex(createKnexConfig());

try {
  const [completedMigrations, pendingMigrations] = await db.migrate.list();

  console.log('Completed migrations:');
  if (completedMigrations.length === 0) {
    console.log('- none');
  } else {
    completedMigrations.forEach((migration) => {
      console.log(`- ${migration.file}`);
    });
  }

  console.log('');
  console.log('Pending migrations:');
  if (pendingMigrations.length === 0) {
    console.log('- none');
  } else {
    pendingMigrations.forEach((migration) => {
      console.log(`- ${migration.file}`);
    });
  }
} finally {
  await db.destroy();
}
