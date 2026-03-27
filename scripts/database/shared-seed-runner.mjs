import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { seedsDirectory } from './shared-config.mjs';

const SEEDS_TABLE_NAME = 'knex_seeds';

export async function runPendingSeeds(db) {
  await ensureSeedsTable(db);

  const seedFiles = listSeedFiles();
  const executedSeeds = await db(SEEDS_TABLE_NAME).select('name');
  const executedSeedNames = new Set(executedSeeds.map((seed) => seed.name));
  const pendingSeeds = seedFiles.filter((seedFile) => !executedSeedNames.has(seedFile));

  if (pendingSeeds.length === 0) {
    return {
      batchNumber: null,
      executedSeeds: [],
    };
  }

  const [{ maxBatch }] = await db(SEEDS_TABLE_NAME).max('batch as maxBatch');
  const batchNumber = Number(maxBatch ?? 0) + 1;

  for (const seedFileName of pendingSeeds) {
    await executeSeed(db, seedFileName, batchNumber);
  }

  return {
    batchNumber,
    executedSeeds: pendingSeeds,
  };
}

export async function rollbackLastSeedBatch(db) {
  await ensureSeedsTable(db);

  const [{ maxBatch }] = await db(SEEDS_TABLE_NAME).max('batch as maxBatch');

  if (maxBatch === null || maxBatch === undefined) {
    return {
      batchNumber: null,
      rolledBackSeeds: [],
    };
  }

  const seedsToRollback = await db(SEEDS_TABLE_NAME)
    .select('name')
    .where({ batch: maxBatch })
    .orderBy('run_on', 'desc')
    .orderBy('name', 'desc');

  for (const seed of seedsToRollback) {
    await rollbackSeed(db, seed.name);
  }

  return {
    batchNumber: Number(maxBatch),
    rolledBackSeeds: seedsToRollback.map((seed) => seed.name),
  };
}

export async function listSeedStatus(db) {
  await ensureSeedsTable(db);

  const seedFiles = listSeedFiles();
  const completedSeeds = await db(SEEDS_TABLE_NAME)
    .select('name', 'batch', 'run_on')
    .orderBy('batch', 'asc')
    .orderBy('run_on', 'asc')
    .orderBy('name', 'asc');
  const completedSeedNames = new Set(completedSeeds.map((seed) => seed.name));
  const pendingSeeds = seedFiles.filter((seedFile) => !completedSeedNames.has(seedFile));

  return {
    completedSeeds,
    pendingSeeds,
  };
}

function listSeedFiles() {
  if (!fs.existsSync(seedsDirectory)) {
    return [];
  }

  return fs.readdirSync(seedsDirectory)
    .filter((fileName) => fileName.endsWith('.mjs'))
    .sort((left, right) => left.localeCompare(right));
}

async function executeSeed(db, seedFileName, batchNumber) {
  const seedModule = await loadSeedModule(seedFileName);

  if (typeof seedModule.seed !== 'function') {
    throw new Error(`Seed "${seedFileName}" must export an async "seed(knex)" function.`);
  }

  await db.transaction(async (trx) => {
    const meta = await seedModule.seed(trx);

    await trx(SEEDS_TABLE_NAME).insert({
      name: seedFileName,
      batch: batchNumber,
      run_on: trx.fn.now(),
      meta: meta ?? null,
    });
  });
}

async function rollbackSeed(db, seedFileName) {
  const seedModule = await loadSeedModule(seedFileName);

  if (typeof seedModule.down !== 'function') {
    throw new Error(`Seed "${seedFileName}" must export an async "down(knex)" function to support rollback.`);
  }

  const seedRecord = await db(SEEDS_TABLE_NAME)
    .select('meta')
    .where({ name: seedFileName })
    .first();

  await db.transaction(async (trx) => {
    await seedModule.down(trx, seedRecord?.meta ?? null);

    await trx(SEEDS_TABLE_NAME)
      .where({ name: seedFileName })
      .delete();
  });
}

async function loadSeedModule(seedFileName) {
  const filePath = path.join(seedsDirectory, seedFileName);
  const fileUrl = pathToFileURL(filePath);

  fileUrl.searchParams.set('ts', String(Date.now()));

  return import(fileUrl.href);
}

async function ensureSeedsTable(db) {
  const hasSeedsTable = await db.schema.hasTable(SEEDS_TABLE_NAME);

  if (hasSeedsTable) {
    return;
  }

  await db.schema.createTable(SEEDS_TABLE_NAME, (table) => {
    table.string('name', 255).primary();
    table.integer('batch').notNullable();
    table.timestamp('run_on').notNullable().defaultTo(db.fn.now());
    table.jsonb('meta').nullable();
    table.index(['batch'], 'IDX_knex_seeds_batch');
  });
}
