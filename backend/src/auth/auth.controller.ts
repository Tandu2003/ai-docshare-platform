import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto';
import { JwtAuthGuard } from './guards';
import { AuthUser } from './interfaces';
import { ResponseHelper } from '@/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
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

  @Get('abilities')
  @UseGuards(JwtAuthGuard)
  async getUserAbilities(
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response
  ): Promise<void> {
    try {
      const user = request.user;
      console.log('🔐 Getting abilities for user:', user.id, user.role?.name);

      // Create simple permissions based on user role
      let rules: any[] = [];

      if (user.role?.name === 'admin') {
        rules = [{ action: 'manage', subject: 'all' }];
      } else if (user.role?.name === 'moderator') {
        rules = [
          { action: 'read', subject: 'all' },
          { action: 'update', subject: 'Document', conditions: { isApproved: false } },
          { action: 'approve', subject: 'Document' },
          { action: 'moderate', subject: 'Comment' },
          { action: 'moderate', subject: 'User' },
        ];
      } else if (user.role?.name === 'publisher') {
        rules = [
          { action: 'create', subject: 'Document' },
          { action: 'update', subject: 'Document', conditions: { uploaderId: user.id } },
          { action: 'delete', subject: 'Document', conditions: { uploaderId: user.id } },
          { action: 'upload', subject: 'File' },
          { action: 'read', subject: 'Document', conditions: { uploaderId: user.id } },
          { action: 'read', subject: 'File', conditions: { uploaderId: user.id } },
        ];
      } else {
        // Default user permissions
        rules = [
          { action: 'read', subject: 'Document', conditions: { isPublic: true, isApproved: true } },
          { action: 'create', subject: 'Document' },
          { action: 'update', subject: 'Document', conditions: { uploaderId: user.id } },
          { action: 'delete', subject: 'Document', conditions: { uploaderId: user.id } },
          { action: 'upload', subject: 'File' },
          { action: 'read', subject: 'Document', conditions: { uploaderId: user.id } },
          { action: 'read', subject: 'File', conditions: { uploaderId: user.id } },
          { action: 'create', subject: 'Comment' },
          { action: 'update', subject: 'Comment', conditions: { userId: user.id } },
          { action: 'delete', subject: 'Comment', conditions: { userId: user.id } },
          { action: 'create', subject: 'Rating' },
          { action: 'update', subject: 'Rating', conditions: { userId: user.id } },
          { action: 'create', subject: 'Bookmark' },
          { action: 'delete', subject: 'Bookmark', conditions: { userId: user.id } },
          {
            action: 'download',
            subject: 'Document',
            conditions: { isPublic: true, isApproved: true },
          },
          { action: 'download', subject: 'Document', conditions: { uploaderId: user.id } },
        ];
      }

      console.log('🔐 Created rules for role:', user.role?.name, 'Count:', rules.length);
      ResponseHelper.success(response, { rules }, 'User abilities retrieved successfully');
    } catch (error) {
      console.error('🔐 Error in getUserAbilities:', error);
      ResponseHelper.error(response, 'Failed to get user abilities', 500);
    }
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
