import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../dto/auth-response.dto.js';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    return data ? user?.[data] : user;
  },
);
