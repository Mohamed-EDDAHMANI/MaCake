/**
 * Unified API response structure used by the gateway and all microservices.
 */

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
}

export interface ResponseErrorItem {
  field: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta: ResponseMeta | null;
  errors: ResponseErrorItem[] | null;
  timestamp: string;
  path: string;
}

export function successResponse<T>(
  data: T,
  message: string,
  options?: {
    statusCode?: number;
    meta?: ResponseMeta | null;
    path?: string;
  },
): ApiResponse<T> {
  return {
    success: true,
    statusCode: options?.statusCode ?? 200,
    message,
    data,
    meta: options?.meta ?? null,
    errors: null,
    timestamp: new Date().toISOString(),
    path: options?.path ?? '',
  };
}

export function errorResponse(
  statusCode: number,
  message: string,
  errors?: ResponseErrorItem[] | null,
  options?: { path?: string },
): ApiResponse<null> {
  return {
    success: false,
    statusCode,
    message,
    data: null,
    meta: null,
    errors: errors ?? null,
    timestamp: new Date().toISOString(),
    path: options?.path ?? '',
  };
}

/**
 * Check if a value is already in ApiResponse format (has success, statusCode, message, data, meta, errors, timestamp, path).
 */
export function isApiResponse(value: any): value is ApiResponse {
  return (
    value &&
    typeof value.success === 'boolean' &&
    typeof value.statusCode === 'number' &&
    typeof value.message === 'string' &&
    'data' in value &&
    'meta' in value &&
    'errors' in value &&
    typeof value.timestamp === 'string' &&
    typeof value.path === 'string'
  );
}

/**
 * Normalize microservice raw response into ApiResponse (e.g. auth returns { user, accessToken } → wrap in data).
 */
export function normalizeToApiResponse(
  raw: any,
  defaultMessage: string,
  path: string,
  statusCode: number = 200,
): ApiResponse {
  if (isApiResponse(raw)) {
    return { ...raw, path: raw.path || path, timestamp: new Date().toISOString() };
  }
  return successResponse(raw, raw?.message ?? defaultMessage, {
    statusCode: raw?.statusCode ?? statusCode,
    path,
  });
}
