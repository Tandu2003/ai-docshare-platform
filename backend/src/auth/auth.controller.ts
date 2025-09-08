import { Public } from '@/auth/decorators/public.decorator';
import { ResponseHelper } from '@/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import { JwtAuthGuard } from './guards';
import { AuthUser } from './interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async register(@Body() registerDto: RegisterDto, @Res() response: Response): Promise<void> {
    const result = await this.authService.register(registerDto);

    // Return success message
    ResponseHelper.created(
      response,
      result,
      'Registration successful! Please check your email to verify your account.'
    );
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async login(@Body() loginDto: LoginDto, @Res() response: Response): Promise<void> {
    const result = await this.authService.login(loginDto);

    // Set refresh token as httpOnly cookie
    this.setRefreshTokenCookie(response, result.tokens.refreshToken);

    // Return user data and access token
    ResponseHelper.success(
      response,
      {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
      'Login successful'
    );
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async refreshToken(@Req() request: Request, @Res() response: Response): Promise<void> {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      ResponseHelper.error(response, 'Refresh token not found', HttpStatus.UNAUTHORIZED);
      return;
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    // Set new refresh token as httpOnly cookie
    this.setRefreshTokenCookie(response, tokens.refreshToken);

    ResponseHelper.success(
      response,
      { accessToken: tokens.accessToken },
      'Token refreshed successfully'
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Res() response: Response): Promise<void> {
    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    ResponseHelper.success(response, null, 'Logout successful');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    const { password, ...userWithoutPassword } = request.user as any;

    ResponseHelper.success(response, userWithoutPassword, 'Profile retrieved successfully');
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res() response: Response
  ): Promise<void> {
    const result = await this.authService.verifyEmail(verifyEmailDto);

    ResponseHelper.success(response, result, 'Email verified successfully');
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
    @Res() response: Response
  ): Promise<void> {
    const result = await this.authService.resendVerification(resendDto);

    ResponseHelper.success(response, result, 'Verification email sent');
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Res() response: Response
  ): Promise<void> {
    const result = await this.authService.forgotPassword(forgotPasswordDto);

    ResponseHelper.success(response, result, 'Password reset instructions sent');
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Res() response: Response
  ): Promise<void> {
    const result = await this.authService.resetPassword(resetPasswordDto);

    ResponseHelper.success(response, result, 'Password reset successfully');
  }

  // Private helper methods

  private setRefreshTokenCookie(response: Response, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
