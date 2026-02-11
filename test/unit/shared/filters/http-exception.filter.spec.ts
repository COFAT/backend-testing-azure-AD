import { HttpExceptionFilter } from '@shared/filters/http-exception.filter';
import {
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { method: string; url: string };

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus, json: mockJson };
    mockRequest = { method: 'GET', url: '/api/test' };
  });

  const createMockArgumentsHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getType: () => 'http',
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({ getData: jest.fn(), getContext: jest.fn() }),
      switchToWs: () => ({
        getData: jest.fn(),
        getClient: jest.fn(),
        getPattern: jest.fn(),
      }),
    }) as unknown as ArgumentsHost;

  describe('catch', () => {
    it('should format BadRequestException correctly', () => {
      const exception = new BadRequestException('Invalid input');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'BadRequest',
          path: '/api/test',
        }),
      );
    });

    it('should format UnauthorizedException correctly', () => {
      const exception = new UnauthorizedException('Invalid token');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.UNAUTHORIZED,
          error: 'Unauthorized',
        }),
      );
    });

    it('should format NotFoundException correctly', () => {
      const exception = new NotFoundException('User not found');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          error: 'NotFound',
        }),
      );
    });

    it('should format ForbiddenException correctly', () => {
      const exception = new ForbiddenException('Access denied');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          error: 'Forbidden',
        }),
      );
    });

    it('should format InternalServerErrorException correctly', () => {
      const exception = new InternalServerErrorException('Server error');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'InternalServerError',
        }),
      );
    });

    it('should merge structured error responses (health check)', () => {
      // Simulate health check failure response from @nestjs/terminus
      const healthCheckResponse = {
        status: 'error',
        info: { database: { status: 'up' } },
        error: { redis: { status: 'down', message: 'Connection refused' } },
        details: {
          database: { status: 'up' },
          redis: { status: 'down', message: 'Connection refused' },
        },
      };
      const exception = new ServiceUnavailableException(healthCheckResponse);
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          status: 'error',
          info: { database: { status: 'up' } },
          error: { redis: { status: 'down', message: 'Connection refused' } },
          details: expect.objectContaining({
            database: { status: 'up' },
            redis: { status: 'down', message: 'Connection refused' },
          }),
        }),
      );
    });

    it('should include timestamp in response', () => {
      const exception = new BadRequestException('Test');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );

      // Verify timestamp is valid ISO string
      const call = mockJson.mock.calls[0][0];
      const timestamp = new Date(call.timestamp);
      expect(timestamp.toISOString()).toBe(call.timestamp);
    });

    it('should include request path in response', () => {
      mockRequest.url = '/api/users/123';
      const exception = new NotFoundException('User not found');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/users/123',
        }),
      );
    });

    it('should handle string exception response', () => {
      const exception = new BadRequestException('Simple error message');
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'BadRequest',
          message: 'Simple error message',
        }),
      );
    });

    it('should handle validation errors with array of messages', () => {
      const validationErrors = [
        'email must be an email',
        'password must be at least 8 characters',
      ];
      const exception = new BadRequestException(validationErrors);
      const host = createMockArgumentsHost();

      filter.catch(exception, host);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'BadRequest',
          message: validationErrors,
        }),
      );
    });
  });
});
