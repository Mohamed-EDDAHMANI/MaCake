import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';
import type { ApiResponse } from '../types/api-response';

/** Ensures every error returned to the gateway has the same structure: success, statusCode, message, data, error, timestamp. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    this.logger.error(`Error caught: ${JSON.stringify(exception)}`);

    if (exception?.toJSON && typeof exception.toJSON === 'function') {
      const errorResponse = exception.toJSON() as ApiResponse<null>;
      return throwError(() => new RpcException(errorResponse));
    }
    if (exception?.getError && typeof exception.getError === 'function') {
      const err = exception.getError();
      if (err && typeof err === 'object' && 'success' in err && 'statusCode' in err && 'error' in err) {
        return throwError(() => new RpcException(err));
      }
    }

    const standard: ApiResponse<null> = {
      success: false,
      statusCode: exception?.statusCode ?? exception?.code ?? 500,
      message: exception?.message ?? 'Internal server error',
      data: null,
      error: {
        code: exception?.code ?? exception?.name ?? 'INTERNAL_ERROR',
        statusCode: exception?.statusCode ?? exception?.code ?? 500,
        message: exception?.message ?? 'Internal server error',
        ...(exception?.details && { details: exception.details }),
      },
      timestamp: new Date().toISOString(),
    };
    return throwError(() => new RpcException(standard));
  }
}
