import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType();
    if (type === 'http') {
        const req = context.switchToHttp().getRequest();
        const { method, url, body, query, params } = req;
        const start = Date.now();

        return next.handle().pipe(
        tap({
            next: (response) => {
            const res = context.switchToHttp().getResponse();
            const duration = Date.now() - start;

            this.logger.log(
                'info',
                `[${method}] ${url} - status: ${res.statusCode || 200} - ${duration}ms`,
                {
                body,
                query,
                params,
                response,
                },
            );
            },
            error: (err) => {
            const duration = Date.now() - start;

            this.logger.log(
                'error',
                `[${method}] ${url} - error - ${duration}ms`,
                {
                body,
                query,
                params,
                error: {
                    message: err.message,
                    stack: err.stack,
                },
                },
            );
            },
        }),
        );
    } 
    // Handle RPC/Microservice logging if needed, or pass through
    return next.handle();
  }
}
