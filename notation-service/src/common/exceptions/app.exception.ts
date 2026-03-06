import type { ApiResponse } from '../types/api-response';

export class ServiceError extends Error {
  public readonly success: boolean;
  public readonly errorType: string;
  public readonly message: string;
  public readonly code: number;
  public readonly serviceName: string;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    errorType: string,
    message: string,
    code: number,
    serviceName: string = 'notation-service',
    details?: any,
  ) {
    super(message);
    this.success = false;
    this.errorType = errorType;
    this.message = message;
    this.code = code;
    this.serviceName = serviceName;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /** Same structure as gateway / all services: success, statusCode, message, data, error, timestamp. */
  toJSON(): ApiResponse<null> {
    return {
      success: false,
      statusCode: this.code,
      message: this.message,
      data: null,
      error: {
        code: this.errorType,
        statusCode: this.code,
        message: this.message,
        ...(this.details && Object.keys(this.details).length > 0 && { details: this.details }),
      },
      timestamp: this.timestamp,
    };
  }
}
