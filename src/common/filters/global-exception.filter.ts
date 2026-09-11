import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

interface HttpErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  [key: string]: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred.';
    let error = 'Internal Server Error';
    let errors: string[] | undefined;
    let stack: string | undefined;

    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Extract stack trace if error is an instance of Error
    if (exception instanceof Error && exception.stack) {
      stack = exception.stack;
    }

    // 1. Handle NestJS Built-in HTTP Exceptions
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const payload = exceptionResponse as HttpErrorPayload;
        error = payload.error || exception.name;

        if (Array.isArray(payload.message)) {
          message = 'Validation failed';
          errors = payload.message;
        } else if (typeof payload.message === 'string') {
          message = payload.message;
        } else {
          message = exception.message;
        }
      }
    }
    // 2. Handle Prisma Database Exceptions
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          statusCode = HttpStatus.CONFLICT;
          error = 'Conflict';
          const target = (exception.meta?.target as string[]) || [];
          const fields = target.length > 0 ? target.join(', ') : 'field';
          message = `A record with this ${fields} already exists.`;
          break;
        }
        case 'P2025': {
          statusCode = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = 'The requested record was not found or has been deleted.';
          break;
        }
        case 'P2003': {
          statusCode = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'Invalid reference identifier in request data.';
          break;
        }
        default: {
          statusCode = HttpStatus.BAD_REQUEST;
          error = 'Database Error';
          message = `Database query failed with code ${exception.code}.`;
          break;
        }
      }
    }
    // 3. Handle Generic Runtime JavaScript Errors
    else if (exception instanceof Error) {
      message = isDevelopment
        ? exception.message
        : 'An internal server error occurred. Please try again later.';
    }

    // Always log unexpected 500 errors
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method} ${request.url}] Unhandled Exception: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        stack,
      );
    }

    // Build standard response body
    const responseBody: Record<string, unknown> = {
      success: false,
      statusCode,
      message,
      error,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(isDevelopment && stack ? { stack } : {}),
    };

    response.status(statusCode).json(responseBody);
  }
}
