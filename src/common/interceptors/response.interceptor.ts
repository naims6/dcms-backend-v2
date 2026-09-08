import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  RESPONSE_MESSAGE_KEY,
  BYPASS_RESPONSE_TRANSFORM_KEY,
} from '../decorators/response-message.decorator.js';
import { ApiResponse } from '../interfaces/response.interface.js';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isBypassed) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload: unknown) => {
        const httpContext = context.switchToHttp();
        const response: Response = httpContext.getResponse();
        const statusCode = response.statusCode;

        const decoratorMessage = this.reflector.getAllAndOverride<string>(
          RESPONSE_MESSAGE_KEY,
          [context.getHandler(), context.getClass()],
        );

        let data = payload;
        let meta = undefined;
        let customMessage: string | undefined = undefined;

        if (
          payload !== null &&
          typeof payload === 'object' &&
          !Array.isArray(payload) &&
          ('data' in payload || 'meta' in payload)
        ) {
          data = payload.data !== undefined ? payload.data : null;
          meta = payload.meta;
          if (typeof payload.message === 'string') {
            customMessage = payload.message;
          }
        }

        const message =
          customMessage ||
          decoratorMessage ||
          this.getDefaultMessageByStatus(statusCode);

        return {
          success: true,
          statusCode,
          message,
          data,
          ...(meta !== undefined ? { meta } : {}),
        };
      }),
    );
  }

  private getDefaultMessageByStatus(statusCode: number): string {
    switch (statusCode) {
      case 201:
        return 'Resource created successfully';
      case 202:
        return 'Request accepted successfully';
      case 204:
        return 'Request processed successfully with no content';
      default:
        return 'Operation completed successfully';
    }
  }
}
