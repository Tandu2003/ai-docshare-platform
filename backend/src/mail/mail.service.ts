import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${data.verificationToken}`;

    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Xác thực Email của bạn - AI DocShare Platform',
        template: './verification',
        context: {
          firstName: data.firstName,
          email: data.email,
          verificationUrl,
          frontendUrl: this.frontendUrl,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Không thể gửi email xác thực: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${data.resetToken}`;

    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Đặt lại Mật khẩu của bạn - AI DocShare Platform',
        template: './password-reset',
        context: {
          firstName: data.firstName,
          email: data.email,
          resetUrl,
          frontendUrl: this.frontendUrl,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Không thể gửi email đặt lại mật khẩu: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Chào mừng đến với AI DocShare Platform!',
        template: './welcome',
        context: {
          firstName: data.firstName,
          email: data.email,
          dashboardUrl: `${this.frontendUrl}/dashboard`,
          frontendUrl: this.frontendUrl,
        },
      });
    } catch {
      // Don't throw error for welcome email as it's not critical
    }
  }

  async sendPasswordResetConfirmationEmail(
    data: WelcomeEmailData,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Đặt lại Mật khẩu Thành công - AI DocShare Platform',
        template: './password-reset-confirmation',
        context: {
          firstName: data.firstName,
          email: data.email,
          dashboardUrl: `${this.frontendUrl}/dashboard`,
          frontendUrl: this.frontendUrl,
        },
      });
    } catch {
      // Don't throw error as it's not critical
    }
  }
}
