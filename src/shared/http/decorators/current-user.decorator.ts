import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.session?.userId
      ? {
          id: request.session.userId,
          email: request.session.email,
        }
      : null;

    return data ? user?.[data] : user;
  },
);
