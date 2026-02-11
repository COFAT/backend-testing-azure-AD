import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsDateString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsPhoneNumber } from '@shared/validators';
import { IsMinAge } from '@shared/validators';

/**
 * Transform helper for email normalization
 */
const normalizeEmail = ({ value }: TransformFnParams): string => {
  if (typeof value === 'string') {
    return value.toLowerCase().trim();
  }
  return value as string;
};

/**
 * Transform helper for string trimming
 */
const trimString = ({ value }: TransformFnParams): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value as string;
};

/**
 * Gender enum matching Prisma schema
 */
export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

// ============================================================================
// LOGIN
// ============================================================================

export class LoginDto {
  @ApiProperty({
    example: 'candidate@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 6 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}

// ============================================================================
// REGISTER
// ============================================================================

export class RegisterDto {
  @ApiProperty({
    example: 'candidate@example.com',
    description: 'Email address (must be unique)',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 6 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'First name',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  @Transform(trimString)
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  @Transform(trimString)
  lastName: string;

  @ApiProperty({
    enum: Gender,
    example: Gender.Male,
    description: 'Gender (Male or Female)',
  })
  @IsEnum(Gender, { message: 'Gender must be Male or Female' })
  @IsNotEmpty({ message: 'Gender is required' })
  gender: Gender;

  @ApiProperty({
    example: '1995-06-15',
    description:
      'Date of birth (ISO 8601 format, must be at least 16 years old)',
  })
  @IsDateString(
    {},
    { message: 'Please provide a valid date in YYYY-MM-DD format' },
  )
  @IsNotEmpty({ message: 'Date of birth is required' })
  @IsMinAge(16, { message: 'You must be at least 16 years old' })
  dateOfBirth: string;

  @ApiPropertyOptional({
    example: '+21612345678',
    description: 'Phone number (international format)',
  })
  @IsOptional()
  @IsPhoneNumber({
    message: 'Please provide a valid phone number (e.g., +21612345678)',
  })
  phone?: string;
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token received during login',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

// ============================================================================
// PASSWORD RESET
// ============================================================================

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to send password reset OTP',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP code received via email',
  })
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @MinLength(6, { message: 'OTP must be 6 digits' })
  @MaxLength(6, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'New password (min 6 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;
}

// ============================================================================
// OTP VERIFICATION
// ============================================================================

export class VerifyOtpDto {
  @ApiProperty({
    example: 'candidate@example.com',
    description: 'Email address to verify',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via email',
  })
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @MinLength(6, { message: 'OTP must be 6 digits' })
  @MaxLength(6, { message: 'OTP must be 6 digits' })
  otp: string;
}

// ============================================================================
// RESEND OTP
// ============================================================================

export class ResendOtpDto {
  @ApiProperty({
    example: 'candidate@example.com',
    description: 'Email address to resend OTP',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(normalizeEmail)
  email: string;

  @ApiProperty({
    example: 'email_verification',
    description: 'Purpose of OTP (email_verification or password_reset)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Purpose is required' })
  purpose: 'email_verification' | 'password_reset';
}
