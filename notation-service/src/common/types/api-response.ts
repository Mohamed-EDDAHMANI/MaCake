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
