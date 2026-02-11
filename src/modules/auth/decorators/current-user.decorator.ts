import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current authenticated user from the request
 *
 * Usage:
 * @Get('me')
 * getMe(@CurrentUser() user: { userId: string; email: string; role: string }) {
 *   return user;
 * }
 *
 * // Or extract specific property
 * @Get('me')
 * getMe(@CurrentUser('userId') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return just that
    if (data && user) {
      return user[data];
    }

    return user;
  },
);
