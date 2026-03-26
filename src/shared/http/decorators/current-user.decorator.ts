import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  getCurrentUserFromSession,
  getSessionFromContext,
} from '@/shared/context/execution-context-session.util';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const user = getCurrentUserFromSession(getSessionFromContext(ctx));

    return data ? user?.[data] : user;
  },
);
