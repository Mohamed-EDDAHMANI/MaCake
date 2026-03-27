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
    serviceName: string = 'payment-service',
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

  toJSON() {
    return {
      success: this.success,
      statusCode: this.code,
      message: this.message,
      error: {
        type: this.errorType,
        message: this.message,
        code: this.code,
        serviceName: this.serviceName,
        ...(this.details && { details: this.details }),
      },
      timestamp: this.timestamp,
    };
  }
}
