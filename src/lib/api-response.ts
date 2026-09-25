import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Standardized API Response Builders for Next.js App Router
 */
export class ApiResponse {
  static success<T>(data: T, message?: string, statusCode = 200, meta?: Record<string, unknown>) {
    const payload: ApiSuccessResponse<T> = {
      success: true,
      ...(message && { message }),
      data,
      ...(meta && { meta }),
    };
    return NextResponse.json(payload, { status: statusCode });
  }

  static created<T>(data: T, message = 'Resource created successfully') {
    return ApiResponse.success(data, message, 201);
  }

  static error(message: string, statusCode = 500, details?: unknown) {
    const payload: ApiErrorResponse = {
      success: false,
      error: message,
      statusCode,
      ...(details && { details }),
    };
    return NextResponse.json(payload, { status: statusCode });
  }

  static badRequest(message = 'Bad Request', details?: unknown) {
    return ApiResponse.error(message, 400, details);
  }

  static notFound(message = 'Resource not found') {
    return ApiResponse.error(message, 404);
  }

  static unauthorized(message = 'Unauthorized') {
    return ApiResponse.error(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return ApiResponse.error(message, 403);
  }

  static tooManyRequests(message = 'Too many requests', details?: unknown) {
    return ApiResponse.error(message, 429, details);
  }

  static serverError(message = 'Internal Server Error', details?: unknown) {
    return ApiResponse.error(message, 500, details);
  }
}
