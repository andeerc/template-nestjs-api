import { SessionStorageService } from '@/shared/session-storage/session-storage.service';
import { getSessionFromContext } from '@/shared/context/execution-context-session.util';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SessionStorageInterceptor implements NestInterceptor {
  constructor(
    private readonly _sessionStorageService: SessionStorageService,
  ) { }

  // eslint-disable-next-line @typescript-eslint/require-await
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const session = getSessionFromContext(context);
    if (!session) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      this._sessionStorageService.storage.run(session, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
