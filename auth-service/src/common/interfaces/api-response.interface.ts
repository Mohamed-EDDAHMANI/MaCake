/**
 * Same structure as catalog-service and gateway.
 * success, statusCode, message, data, error, timestamp.
 */
export interface StandardError {
  code: string;
  statusCode: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  error: StandardError | null;
  timestamp: string;
}

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
