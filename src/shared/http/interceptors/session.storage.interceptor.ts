import { SessionStorageService } from '@/shared/session-storage/session-storage.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

@Injectable()
export class SessionStorageInterceptor implements NestInterceptor {
  constructor(
    private readonly _sessionStorageService: SessionStorageService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();

    return new Observable((subscriber) => {
      this._sessionStorageService.storage.run(req.session, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
