import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { getSessionFromContext } from '@/shared/context/execution-context-session.util';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const session = getSessionFromContext(context);

    if (!session?.authenticated || !session?.userId) {
      if (context.getType<'http' | 'ws'>() === 'ws') {
        throw new WsException('User not authenticated');
      }

      throw new UnauthorizedException('User not authenticated');
    }

    return true;
  }
}
