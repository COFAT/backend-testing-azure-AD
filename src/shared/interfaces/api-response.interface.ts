/**
 * Standard API Response Interface
 * All successful API responses follow this format
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: ResponseMeta;
  timestamp: string;
}

/**
 * Standard API Error Response Interface
 * All error responses follow this format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | unknown[];
  };
  timestamp: string;
  path?: string;
}

/**
 * Metadata for paginated responses
 */
export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: Required<ResponseMeta>;
}
