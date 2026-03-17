import { RedisModule } from '@nestjs-modules/ioredis';
import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { cacheConfig } from './config/cache.config';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: () => cacheConfig(),
    })
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheServiceModule {}
