import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';

export type OtpPurpose = 'email_verification' | 'password_reset';

interface OtpData {
  code: string;
  userId: string;
  attempts: number;
  createdAt: number;
}

@Injectable()
export class OtpService {
  private readonly otpLength: number;
  private readonly otpExpiresInMinutes: number;
  private readonly maxAttemptsPerHour: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.otpLength = this.configService.get<number>('otp.length', 6);
    this.otpExpiresInMinutes = this.configService.get<number>(
      'otp.expiresInMinutes',
      10,
    );
    this.maxAttemptsPerHour = this.configService.get<number>(
      'otp.maxAttemptsPerHour',
      3,
    );
  }

  /**
   * Generate cache key for OTP
   */
  private getOtpKey(userId: string, purpose: OtpPurpose): string {
    return `otp:${purpose}:${userId}`;
  }

  /**
   * Generate cache key for rate limiting
   */
  private getRateLimitKey(email: string, purpose: OtpPurpose): string {
    return `otp_rate:${purpose}:${email}`;
  }

  /**
   * Generate a random OTP code
   */
  private generateCode(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return randomInt(min, max + 1).toString();
  }

  /**
   * Check if user has exceeded OTP request rate limit
   */
  async checkRateLimit(email: string, purpose: OtpPurpose): Promise<void> {
    const rateLimitKey = this.getRateLimitKey(email, purpose);
    const currentCount = await this.cacheManager.get<number>(rateLimitKey);

    if (currentCount && currentCount >= this.maxAttemptsPerHour) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again later.',
      );
    }
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(
    email: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const rateLimitKey = this.getRateLimitKey(email, purpose);
    const currentCount =
      (await this.cacheManager.get<number>(rateLimitKey)) || 0;

    // Set rate limit counter with 1 hour TTL
    await this.cacheManager.set(rateLimitKey, currentCount + 1, 3600 * 1000);
  }

  /**
   * Generate and store OTP in Redis
   * @returns The generated OTP code
   */
  async generateOtp(
    userId: string,
    email: string,
    purpose: OtpPurpose,
  ): Promise<string> {
    // Check rate limit first
    await this.checkRateLimit(email, purpose);

    const code = this.generateCode();
    const otpKey = this.getOtpKey(userId, purpose);

    const otpData: OtpData = {
      code,
      userId,
      attempts: 0,
      createdAt: Date.now(),
    };

    // Store OTP in Redis with TTL
    await this.cacheManager.set(
      otpKey,
      otpData,
      this.otpExpiresInMinutes * 60 * 1000, // TTL in milliseconds
    );

    // Increment rate limit counter
    await this.incrementRateLimit(email, purpose);

    return code;
  }

  /**
   * Validate OTP code
   * @returns true if valid, throws BadRequestException if invalid
   */
  async validateOtp(
    userId: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<boolean> {
    const otpKey = this.getOtpKey(userId, purpose);
    const otpData = await this.cacheManager.get<OtpData>(otpKey);

    if (!otpData) {
      throw new BadRequestException(
        'OTP has expired or is invalid. Please request a new one.',
      );
    }

    // Check if too many failed attempts (max 5)
    if (otpData.attempts >= 5) {
      await this.cacheManager.del(otpKey);
      throw new BadRequestException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    // Validate code
    if (otpData.code !== code) {
      // Increment failed attempts
      otpData.attempts += 1;
      const remainingTtl =
        this.otpExpiresInMinutes * 60 * 1000 - (Date.now() - otpData.createdAt);

      if (remainingTtl > 0) {
        await this.cacheManager.set(otpKey, otpData, remainingTtl);
      }

      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    // OTP is valid - delete it to prevent reuse
    await this.cacheManager.del(otpKey);

    return true;
  }

  /**
   * Invalidate OTP (useful when user requests a new one)
   */
  async invalidateOtp(userId: string, purpose: OtpPurpose): Promise<void> {
    const otpKey = this.getOtpKey(userId, purpose);
    await this.cacheManager.del(otpKey);
  }
}
