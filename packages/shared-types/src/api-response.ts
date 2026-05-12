/**
 * Standardized API Response Format
 * Used across all endpoints for consistent error/success handling
 */

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

/**
 * Standard error codes
 */
export enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Service errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // External service errors
  FIREBASE_ERROR = 'FIREBASE_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',

  // Business logic
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
}

/**
 * HTTP status codes for error codes
 */
export const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 504,
  [ErrorCode.FIREBASE_ERROR]: 500,
  [ErrorCode.OPENAI_ERROR]: 502,
  [ErrorCode.REDIS_ERROR]: 500,
  [ErrorCode.INVALID_STATE]: 400,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 403,
  [ErrorCode.INSUFFICIENT_QUOTA]: 429,
};

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiSuccess<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Custom API Error class
 */
export class ApiErrorException extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiErrorException';
  }

  toResponse(): ApiError {
    return createErrorResponse(this.code, this.message, this.details);
  }

  getStatusCode(): number {
    return ERROR_CODE_TO_STATUS[this.code] || 500;
  }
}
