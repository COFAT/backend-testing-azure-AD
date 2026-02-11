import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HttpExceptionFilter
 *
 * Catches all HTTP exceptions and formats them into a standardized error response.
 * Automatically merges structured responses (like health check failures) into the output.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract a clean message
    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>).message ||
          exception.message
        : exceptionResponse;

    // Extract the error name (e.g., "UnauthorizedException" -> "Unauthorized")
    const errorName = exception.name.replace('Exception', '');

    // Log 5xx errors with stack trace
    if (status >= 500) {
      const logMessage =
        typeof message === 'object'
          ? JSON.stringify(message)
          : (message as string);

      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${logMessage}`,
        exception.stack,
      );
    }

    // Build base response first
    let errorResponse: Record<string, unknown> = {
      success: false,
      path: request.url,
      statusCode: status,
      error: errorName,
      message: message,
      timestamp: new Date().toISOString(),
    };

    // If it's a structured error (like a Health Check failure), merge the details
    // Preserve structured error objects (health check failures), but override string errors
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      const { message: __, ...structuredData } = resp;

      // Keep our errorName unless the response has a structured error object (for health checks)
      if (typeof resp.error === 'object' && resp.error !== null) {
        errorResponse = { ...errorResponse, ...structuredData };
      } else {
        const { error: _, ...rest } = structuredData;
        errorResponse = { ...errorResponse, ...rest };
      }
    }

    response.status(status).json(errorResponse);
  }
}
