import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';
import { envConfig } from '@/config/env.config';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: envConfig.redis.host,
        port: envConfig.redis.port,
        password: envConfig.redis.password,
        db: envConfig.redis.db,
      },
      prefix: 'queue-',
      defaultJobOptions: {
        attempts: 1,
      },
    })
  ],
  exports: [BullModule],
})
export class QueueModule {}
