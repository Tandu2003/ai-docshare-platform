import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface VerificationEmailData {
  firstName: string;
  email: string;
  verificationToken: string;
}

export interface PasswordResetEmailData {
  firstName: string;
  email: string;
  resetToken: string;
}

export interface WelcomeEmailData {
  firstName: string;
  email: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(data: VerificationEmailData): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${data.verificationToken}`;

    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Verify Your Email - AI DocShare Platform',
        template: './verification',
        context: {
          firstName: data.firstName,
          email: data.email,
          verificationUrl,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Verification email sent to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${data.email}`, error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${data.resetToken}`;

    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Reset Your Password - AI DocShare Platform',
        template: './password-reset',
        context: {
          firstName: data.firstName,
          email: data.email,
          resetUrl,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Password reset email sent to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${data.email}`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Welcome to AI DocShare Platform!',
        template: './welcome',
        context: {
          firstName: data.firstName,
          email: data.email,
          dashboardUrl: `${this.frontendUrl}/dashboard`,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Welcome email sent to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${data.email}`, error);
      // Don't throw error for welcome email as it's not critical
    }
  }

  /**
   * Send notification email for successful password reset
   */
  async sendPasswordResetConfirmationEmail(data: WelcomeEmailData): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Password Reset Successful - AI DocShare Platform',
        template: './password-reset-confirmation',
        context: {
          firstName: data.firstName,
          email: data.email,
          dashboardUrl: `${this.frontendUrl}/dashboard`,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Password reset confirmation email sent to ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset confirmation email to ${data.email}`, error);
      // Don't throw error as it's not critical
    }
  }
}
