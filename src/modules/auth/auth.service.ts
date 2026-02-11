import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OtpService } from './services/otp.service';
import { EmailService } from '@modules/notifications/services/email.service';
import { RegisterDto, Gender } from './dto/auth.dto';
import { formatPhoneToE164 } from '@shared/validators';
import { Gender as PrismaGender, UserStatus } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
  message: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================================================
  // REGISTRATION
  // ============================================================================

  async register(registerDto: RegisterDto): Promise<RegisterResult> {
    const { email, password, firstName, lastName, gender, dateOfBirth, phone } =
      registerDto;

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Format phone number to E.164 if provided
    const formattedPhone = phone ? formatPhoneToE164(phone) : null;

    // Map DTO Gender to Prisma Gender
    const prismaGender: PrismaGender =
      gender === Gender.Male ? PrismaGender.Male : PrismaGender.Female;

    // Create user with pending_verification status
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        gender: prismaGender,
        dateOfBirth: new Date(dateOfBirth),
        phone: formattedPhone,
        role: 'candidate',
        status: UserStatus.pending_verification,
        isEmailVerified: false,
      },
    });

    // Generate OTP and send verification email
    const otp = await this.otpService.generateOtp(
      user.id,
      user.email,
      'email_verification',
    );

    await this.emailService.sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      otp,
    });

    this.logger.log(`User registered: ${user.email}`);

    return {
      userId: user.id,
      email: user.email,
      message:
        'Registration successful. Please check your email for verification code.',
    };
  }

  // ============================================================================
  // OTP VERIFICATION
  // ============================================================================

  async verifyEmail(email: string, otp: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Validate OTP
    await this.otpService.validateOtp(user.id, otp, 'email_verification');

    // Update user status
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        status: UserStatus.pending_profile,
      },
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail({
      email: user.email,
      firstName: user.firstName,
    });

    this.logger.log(`Email verified: ${user.email}`);

    return {
      message: 'Email verified successfully. Please complete your profile.',
    };
  }

  async resendOtp(
    email: string,
    purpose: 'email_verification' | 'password_reset',
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a new OTP has been sent.' };
    }

    if (purpose === 'email_verification' && user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new OTP
    const otp = await this.otpService.generateOtp(user.id, user.email, purpose);

    // Send appropriate email
    if (purpose === 'email_verification') {
      await this.emailService.sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        otp,
      });
    } else {
      await this.emailService.sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        otp,
      });
    }

    return { message: 'If the email exists, a new OTP has been sent.' };
  }

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return {
        message: 'If the email exists, a password reset code has been sent.',
      };
    }

    // Generate OTP
    const otp = await this.otpService.generateOtp(
      user.id,
      user.email,
      'password_reset',
    );

    // Send password reset email
    await this.emailService.sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      otp,
    });

    this.logger.log(`Password reset requested: ${user.email}`);

    return {
      message: 'If the email exists, a password reset code has been sent.',
    };
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException('Invalid request');
    }

    // Validate OTP
    await this.otpService.validateOtp(user.id, otp, 'password_reset');

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and invalidate all existing tokens
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    this.logger.log(`Password reset completed: ${user.email}`);

    return { message: 'Password reset successfully. You can now login.' };
  }

  // ============================================================================
  // LOGIN & TOKENS
  // ============================================================================

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check user status
    if (user.status === UserStatus.pending_verification) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    if (user.status === UserStatus.suspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (user.status === UserStatus.inactive) {
      throw new UnauthorizedException('Your account is inactive');
    }

    return user;
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.validateUser(email, password);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    tokenVersion: number;
  }): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'default-refresh-secret',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
        },
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }
}
