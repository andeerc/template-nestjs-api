import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { envConfig } from '@/config/env.config';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: envConfig.redis.host,
        port: envConfig.redis.port,
        password: envConfig.redis.password,
      },
      prefix: 'queue-',
      defaultJobOptions: {
        attempts: 1,
      },
    })
  ]
})
export class QueueModule {}
