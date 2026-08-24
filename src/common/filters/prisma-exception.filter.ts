import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
// import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        response.status(status).json({
          statusCode: status,
          message: `Unique constraint failed on field(s): ${target.join(', ')}`,
          error: 'Conflict',
        });
        break;
      }
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          statusCode: status,
          message: 'Record to update or delete was not found.',
          error: 'Not Found',
        });
        break;
      }
      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        });
        break;
    }
  }
}
