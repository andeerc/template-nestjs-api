import knex from 'knex';
import { createKnexConfig } from './shared-config.mjs';
import { rollbackLastSeedBatch } from './shared-seed-runner.mjs';

const db = knex(createKnexConfig());

try {
  const { batchNumber, rolledBackSeeds } = await rollbackLastSeedBatch(db);

  if (rolledBackSeeds.length === 0) {
    console.log('No seed batch was rolled back.');
  } else {
    console.log(`Rolled back seed batch ${batchNumber}:`);
    rolledBackSeeds.forEach((seedName) => {
      console.log(`- ${seedName}`);
    });
  }
} finally {
  await db.destroy();
}
