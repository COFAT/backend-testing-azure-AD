import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface SendVerificationEmailParams {
  email: string;
  firstName: string;
  otp: string;
}

export interface SendPasswordResetEmailParams {
  email: string;
  firstName: string;
  otp: string;
}

export interface SendWelcomeEmailParams {
  email: string;
  firstName: string;
}

export interface SendAccountCreatedEmailParams {
  email: string;
  firstName: string;
  temporaryPassword: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly otpExpiresInMinutes: number;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      'frontendUrl',
      'http://localhost:4200',
    );
    this.otpExpiresInMinutes = this.configService.get<number>(
      'otp.expiresInMinutes',
      10,
    );
  }

  /**
   * Send email verification OTP
   */
  async sendVerificationEmail(
    params: SendVerificationEmailParams,
  ): Promise<void> {
    const { email, firstName, otp } = params;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify Your Email - COFAT',
        template: 'verification',
        context: {
          title: 'Verify Your Email - COFAT',
          firstName,
          otp,
          expiresIn: this.otpExpiresInMinutes,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send password reset OTP
   */
  async sendPasswordResetEmail(
    params: SendPasswordResetEmailParams,
  ): Promise<void> {
    const { email, firstName, otp } = params;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset Your Password - COFAT',
        template: 'password-reset',
        context: {
          title: 'Reset Your Password - COFAT',
          firstName,
          otp,
          expiresIn: this.otpExpiresInMinutes,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<void> {
    const { email, firstName } = params;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to COFAT!',
        template: 'welcome',
        context: {
          title: 'Welcome to COFAT!',
          firstName,
          ctaUrl: `${this.frontendUrl}/complete-profile`,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send account created email (for admin-created accounts)
   */
  async sendAccountCreatedEmail(
    params: SendAccountCreatedEmailParams,
  ): Promise<void> {
    const { email, firstName, temporaryPassword } = params;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your COFAT Account Has Been Created',
        template: 'account-created',
        context: {
          title: 'Your COFAT Account Has Been Created',
          firstName,
          email,
          temporaryPassword,
          ctaUrl: `${this.frontendUrl}/login`,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Account created email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send account created email to ${email}`,
        error,
      );
      throw error;
    }
  }
}
