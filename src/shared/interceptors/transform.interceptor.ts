import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Decorator key for custom response message
 */
export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Decorator key to skip transformation (for raw responses like file downloads)
 */
export const SKIP_TRANSFORM_KEY = 'skip_transform';

/**
 * TransformInterceptor
 *
 * Wraps all successful responses in a standardized format:
 * {
 *   success: true,
 *   data: <response data>,
 *   message: <optional message>,
 *   timestamp: <ISO timestamp>
 * }
 *
 * This ensures consistent API responses across all endpoints.
 *
 * @example
 * // Controller response: { name: 'John' }
 * // Transformed to: { success: true, data: { name: 'John' }, timestamp: '...' }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // Check if transformation should be skipped (e.g., file downloads)
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    // Get custom message if set via decorator
    const message = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        ...(message && { message }),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
