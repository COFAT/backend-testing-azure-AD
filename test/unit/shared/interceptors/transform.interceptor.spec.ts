import {
  TransformInterceptor,
  RESPONSE_MESSAGE_KEY,
  SKIP_TRANSFORM_KEY,
} from '@shared/interceptors/transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      resolve: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    interceptor = new TransformInterceptor(reflector);
  });

  // Mock ExecutionContext
  const createMockExecutionContext = (): ExecutionContext => ({
    getHandler: jest.fn().mockReturnValue(() => {}),
    getClass: jest.fn().mockReturnValue(class TestClass {}),
    switchToHttp: jest.fn(),
    getType: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  });

  // Mock CallHandler
  const createMockCallHandler = (data: unknown): CallHandler => ({
    handle: () => of(data),
  });

  describe('intercept', () => {
    it('should wrap response in standard format', (done) => {
      const mockData = { id: 1, name: 'Test' };
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(mockData);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data: mockData,
        });
        expect(result.timestamp).toBeDefined();
        expect(typeof result.timestamp).toBe('string');
        done();
      });
    });

    it('should include message when ResponseMessage decorator is used', (done) => {
      const mockData = { id: 1 };
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(mockData);
      const customMessage = 'User created successfully';

      // Mock reflector to return custom message
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === RESPONSE_MESSAGE_KEY) return customMessage;
        return undefined;
      });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data: mockData,
          message: customMessage,
        });
        done();
      });
    });

    it('should skip transformation when SkipTransform decorator is used', (done) => {
      const mockData = { raw: 'data' };
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(mockData);

      // Mock reflector to return skip transform
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === SKIP_TRANSFORM_KEY) return true;
        return undefined;
      });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual(mockData); // Raw data, not wrapped
        done();
      });
    });

    it('should handle null response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(null);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data: null,
        });
        done();
      });
    });

    it('should handle array response', (done) => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(mockData);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data: mockData,
        });
        expect(result.data).toHaveLength(2);
        done();
      });
    });

    it('should handle empty object response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({});

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data: {},
        });
        done();
      });
    });

    it('should have valid ISO timestamp', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({ test: true });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        const timestamp = new Date(result.timestamp);
        expect(timestamp.toISOString()).toBe(result.timestamp);
        done();
      });
    });
  });
});
