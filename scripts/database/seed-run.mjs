import knex from 'knex';
import { createKnexConfig } from './shared-config.mjs';
import { runPendingSeeds } from './shared-seed-runner.mjs';

const db = knex(createKnexConfig());

try {
  const { batchNumber, executedSeeds } = await runPendingSeeds(db);

  if (executedSeeds.length === 0) {
    console.log('No pending seeds found.');
  } else {
    console.log(`Applied seed batch ${batchNumber}:`);
    executedSeeds.forEach((seedName) => {
      console.log(`- ${seedName}`);
    });
  }
} finally {
  await db.destroy();
}
