import type { ApiResponse } from './api-response';

export type { ApiResponse, StandardError } from './api-response';

export function successPayload<T>(message: string, data: T, statusCode = 200): ApiResponse<T> {
  return {
    success: true,
    statusCode,
    message,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  };
}

export function errorPayload(
  statusCode: number,
  message: string,
  code: string,
  details?: Record<string, unknown>,
): ApiResponse<null> {
  return {
    success: false,
    statusCode,
    message,
    data: null,
    error: { code, statusCode, message, ...(details && { details }) },
    timestamp: new Date().toISOString(),
  };
}
