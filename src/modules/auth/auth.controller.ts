import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService, AuthTokens, RegisterResult } from './auth.service';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendOtpDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================================================
  // REGISTRATION
  // ============================================================================

  @Post('register')
  @ApiOperation({ summary: 'Register a new candidate' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ success: boolean; data: RegisterResult; message: string }> {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  // ============================================================================
  // OTP VERIFICATION
  // ============================================================================

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.verifyEmail(
      verifyOtpDto.email,
      verifyOtpDto.otp,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP for email verification or password reset',
  })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists' })
  async resendOtp(
    @Body() resendOtpDto: ResendOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.resendOtp(
      resendOtpDto.email,
      resendOtpDto.purpose,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if email exists',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.forgotPassword(
      forgotPasswordDto.email,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otp,
      resetPasswordDto.newPassword,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  // ============================================================================
  // LOGIN & SESSION
  // ============================================================================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ success: boolean; data: AuthTokens; message: string }> {
    const tokens = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );
    return {
      success: true,
      data: tokens,
      message: 'Login successful',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
  ): Promise<{ success: boolean; data: AuthTokens; message: string }> {
    const tokens = await this.authService.refreshTokens(
      refreshDto.refreshToken,
    );
    return {
      success: true,
      data: tokens,
      message: 'Tokens refreshed successfully',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const user = req.user as { id: string };
    await this.authService.invalidateUserTokens(user.id);
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@Req() req: Request): {
    success: boolean;
    data: unknown;
    message: string;
  } {
    return {
      success: true,
      data: req.user,
      message: 'User retrieved successfully',
    };
  }
}
