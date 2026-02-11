import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * AllExceptionsFilter
 *
 * Catches ALL exceptions (including non-HTTP exceptions like database errors).
 * This is the fallback filter that ensures no unhandled exception escapes
 * without a proper response.
 *
 * IMPORTANT: Register this BEFORE HttpExceptionFilter so it catches
 * only non-HTTP exceptions.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log the full error with stack trace
    this.logger.error(
      `Unhandled exception at ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Build generic error response (don't expose internal details)
    const errorResponse: Record<string, unknown> = {
      success: false,
      path: request.url,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    };

    // In development, include more details
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        name: exception instanceof Error ? exception.name : 'UnknownError',
        message:
          exception instanceof Error ? exception.message : String(exception),
      };
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
}
