import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import express from 'express';
import { errorResponse, ResponseErrorItem } from './interfaces/api-response.interface';

interface ErrorDetails {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  serviceName?: string;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  handleError(error: any, res: express.Response, path: string = ''): void {
    const errorDetails = this.extractErrorDetails(error);
    this.logError(errorDetails);
    const errors = this.detailsToErrorItems(errorDetails);
    const body = errorResponse(
      errorDetails.statusCode,
      errorDetails.message,
      errors.length ? errors : null,
      { path },
    );
    res.status(body.statusCode).json(body);
  }

  private detailsToErrorItems(details: ErrorDetails): ResponseErrorItem[] {
    const d = details.details;
    const msg = details.message;
    if (!d) return msg ? [{ field: 'error', message: msg }] : [];
    if (Array.isArray(d) && d.length && d[0]?.field != null) return d as ResponseErrorItem[];
    if (d?.field) return [{ field: d.field, message: msg }];
    if (Array.isArray(d?.fields)) return d.fields.map((f: string) => ({ field: f, message: msg }));
    if (typeof d === 'object' && !Array.isArray(d))
      return Object.entries(d).map(([field, m]) => ({ field, message: typeof m === 'string' ? m : msg }));
    return msg ? [{ field: 'error', message: msg }] : [];
  }

  private extractErrorDetails(error: any): ErrorDetails {
    this.logger.debug(`Gateway received error: ${JSON.stringify(error)}`);

    const raw = error?.getError?.() ?? error;
    if (raw?.success === false) {
      const statusCode = raw.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
      const message = raw.message ?? 'Internal server error';
      return {
        code: raw.errorType ?? 'ERROR',
        message,
        statusCode: typeof statusCode === 'number' ? statusCode : HttpStatus.INTERNAL_SERVER_ERROR,
        details: raw.errors ?? raw.details,
        serviceName: raw.serviceName,
      };
    }

    if (error?.success === false) {
      const statusCode = error.statusCode ?? error.error?.statusCode ?? error.code ?? HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message ?? error.error?.message ?? 'Internal server error';
      const code = error.errorType ?? error.error?.type ?? 'INTERNAL_SERVER_ERROR';
      const details = error.details ?? error.error?.details;
      const serviceName = error.serviceName ?? error.error?.serviceName;
      return {
        code,
        message,
        statusCode: typeof statusCode === 'number' ? statusCode : HttpStatus.INTERNAL_SERVER_ERROR,
        details,
        serviceName,
      };
    }

    if (error?.error) {
      const serviceError = error.error;
      const code = serviceError.code ?? serviceError.error?.code ?? 'INTERNAL_SERVER_ERROR';
      const message = serviceError.message ?? serviceError.error?.message ?? 'Internal server error';
      const statusCode = serviceError.statusCode ?? serviceError.error?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        code,
        message,
        statusCode: typeof statusCode === 'number' ? statusCode : HttpStatus.INTERNAL_SERVER_ERROR,
        details: serviceError.details ?? serviceError.error?.details,
        serviceName: serviceError.serviceName ?? serviceError.error?.serviceName,
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  private logError(errorDetails: ErrorDetails): void {
    const service = errorDetails.serviceName ? `[${errorDetails.serviceName}]` : '';
    const logMessage = `${service} [${errorDetails.code}] ${errorDetails.message}`;
    if (errorDetails.statusCode >= 500) {
      this.logger.error(logMessage);
    } else if (errorDetails.statusCode >= 400) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }
}
