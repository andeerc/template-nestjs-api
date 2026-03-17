import { join } from 'node:path';
import { envConfig } from '@/config/env.config';
import { User } from '@/modules/users/domain/entities/user.entity';
import { DataSourceOptions } from 'typeorm';

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'api',
  username: process.env.DB_USER || 'api',
  password: process.env.DB_PASSWORD || 'api123',
  ssl: envConfig.isProduction && process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
  entities: [User],
  migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  synchronize: false,
  logging: envConfig.isDevelopment ? ['error', 'warn'] : ['error'],
};
