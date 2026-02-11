import { SetMetadata } from '@nestjs/common';
import {
  RESPONSE_MESSAGE_KEY,
  SKIP_TRANSFORM_KEY,
} from '../interceptors/transform.interceptor';

/**
 * Sets a custom success message for the response
 *
 * @example
 * @ResponseMessage('User created successfully')
 * @Post()
 * create(@Body() dto: CreateUserDto) { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);

/**
 * Skips the TransformInterceptor for raw responses
 * Use for file downloads, streams, or other non-JSON responses
 *
 * @example
 * @SkipTransform()
 * @Get('download')
 * downloadFile() { return streamFile(); }
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
