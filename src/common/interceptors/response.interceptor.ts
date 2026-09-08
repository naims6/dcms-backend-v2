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
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_RESPONSE_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isBypassed) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload: unknown) => {
        const response: Response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        const decoratorMessage = this.reflector.getAllAndOverride<string>(
          RESPONSE_MESSAGE_KEY,
          [context.getHandler(), context.getClass()],
        );

        let data: unknown = payload;
        let meta: Record<string, unknown> | undefined = undefined;

        // If the payload is an object with a `data` property, we treat it as a structured response and extract `data` and `meta` accordingly.
        if (this.isRecord(payload)) {
          if ('data' in payload) {
            data = payload.data;
            if (this.isRecord(payload.meta)) {
              meta = payload.meta;
            }
          }
        }

        const message = decoratorMessage || this.getDefaultMessage(statusCode);

        return {
          success: true,
          statusCode,
          message,
          data,
          ...(meta ? { meta } : {}),
        };
      }),
    );
  }

  private isRecord(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  }

  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 201:
        return 'Resource created successfully';
      case 204:
        return 'Resource processed successfully';
      default:
        return 'Operation completed successfully';
    }
  }
}
