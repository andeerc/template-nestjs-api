import { Global, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import knex, { Knex } from 'knex';
import { knexConfig } from './config/database.config';
import { KNEX_CONNECTION } from './database.constants';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly connection: Knex = knex(knexConfig);

  async onApplicationShutdown() {
    await this.connection.destroy();
  }
}

@Global()
@Module({
  providers: [
    DatabaseService,
    {
      provide: KNEX_CONNECTION,
      inject: [DatabaseService],
      useFactory: (databaseService: DatabaseService) => databaseService.connection,
    },
  ],
  exports: [DatabaseService, KNEX_CONNECTION],
})
export class DatabaseModule {}
