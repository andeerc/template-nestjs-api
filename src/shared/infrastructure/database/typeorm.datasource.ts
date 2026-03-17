import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from './config/database.config';

export default new DataSource(typeOrmConfig);
