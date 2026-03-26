import { envConfig } from '@/config/env.config';
import { Knex } from 'knex';

export const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'api',
    user: process.env.DB_USER || 'api',
    password: process.env.DB_PASSWORD || 'api123',
    ssl: envConfig.isProduction && process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  },
  pool: {
    min: 2,
    max: 10,
  },
};
