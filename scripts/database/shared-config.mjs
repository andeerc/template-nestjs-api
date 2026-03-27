import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const migrationsDirectory = path.resolve(
  currentDirectory,
  '../../src/shared/infrastructure/database/migrations',
);

export const seedsDirectory = path.resolve(
  currentDirectory,
  '../../src/shared/infrastructure/database/seeds',
);

export function createKnexConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'api',
      user: process.env.DB_USER || 'api',
      password: process.env.DB_PASSWORD || 'api123',
      ssl: isProduction && process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: migrationsDirectory,
      extension: 'mjs',
      loadExtensions: ['.mjs'],
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: seedsDirectory,
      extension: 'mjs',
      loadExtensions: ['.mjs'],
      sortDirsSeparately: false,
    },
  };
}
