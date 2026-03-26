import { CacheService } from '@/shared/infrastructure/cache';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from '../decorators/cache-key.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    if (context.getType<'http' | 'ws' | 'rpc'>() !== 'http') {
      return next.handle();
    }

    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    const cachedData = await this.cacheService.cache.get(cacheKey);

    if (cachedData) {
      return of(cachedData);
    }

    const ttl = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.cache.set(cacheKey, response, 'PX', ttl);
      }),
    );
  }
}
