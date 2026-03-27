import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
      this.logger.debug(`================= `);
    this.logger.error(`Error caught: ${JSON.stringify(exception)}`);
    
    // If it's a ServiceError, convert to JSON before wrapping
    if (exception?.toJSON) {
      const errorResponse = exception.toJSON();
      this.logger.debug(`Throwing errorResponse:================= ${JSON.stringify(errorResponse)}`);
      return throwError(() => new RpcException(errorResponse));
    }
    
    return throwError(() => new RpcException(exception));
  }
}
