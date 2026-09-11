import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { UserPayload } from '../dto/auth-response.dto.js';

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user as (UserPayload & { sub?: string }) | undefined;

    if (!user) {
      return undefined;
    }

    if (data === 'id') {
      return user.id || user.sub;
    }

    return data ? user[data] : user;
  },
);
