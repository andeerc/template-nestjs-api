import { Module } from '@nestjs/common';
import { SessionStorageModule } from '../session-storage/session-storage.module';
import { CacheServiceModule } from './cache';
import { DatabaseModule } from './database/database.module';
import { I18nServiceModule } from './i18n/i18n-service.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    I18nServiceModule,
    DatabaseModule,
    CacheServiceModule,
    QueueModule,
    SessionStorageModule,
  ],
})
export class SharedInfrastructureModule {}
