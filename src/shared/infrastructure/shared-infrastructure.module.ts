import { Module } from '@nestjs/common';
import { SessionStorageModule } from '../session-storage/session-storage.module';
import { CacheServiceModule } from './cache';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    DatabaseModule,
    CacheServiceModule,
    QueueModule,
    SessionStorageModule,
  ],
})
export class SharedInfrastructureModule { }
