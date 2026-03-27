import knex from 'knex';
import { createKnexConfig } from './shared-config.mjs';
import { listSeedStatus } from './shared-seed-runner.mjs';

const db = knex(createKnexConfig());

try {
  const { completedSeeds, pendingSeeds } = await listSeedStatus(db);

  console.log('Completed seeds:');
  if (completedSeeds.length === 0) {
    console.log('- none');
  } else {
    completedSeeds.forEach((seed) => {
      console.log(`- [batch ${seed.batch}] ${seed.name} (${seed.run_on})`);
    });
  }

  console.log('');
  console.log('Pending seeds:');
  if (pendingSeeds.length === 0) {
    console.log('- none');
  } else {
    pendingSeeds.forEach((seedName) => {
      console.log(`- ${seedName}`);
    });
  }
} finally {
  await db.destroy();
}
