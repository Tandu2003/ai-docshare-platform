import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '@/auth/auth.service';
import { Public } from '@/auth/decorators/public.decorator';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from '@/auth/dto';
import { JwtAuthGuard } from '@/auth/guards';
import { AuthUser } from '@/auth/interfaces';
import { ResponseHelper } from '@/common';

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async register(
    @Body() registerDto: RegisterDto,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.authService.register(registerDto);

    // Return success message
    ResponseHelper.created(
      response,
      result,
      'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
    );
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async login(
    @Body() loginDto: LoginDto,
    @Res() response: FastifyReply,
  ): Promise<void> {
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
      'Đăng nhập thành công',
    );
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  async refreshToken(
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const refreshToken = (request as any).cookies?.refreshToken;

    if (!refreshToken) {
      ResponseHelper.error(
        response,
        'Không tìm thấy mã làm mới',
        HttpStatus.UNAUTHORIZED,
      );
      return;
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    // Set new refresh token as httpOnly cookie
    this.setRefreshTokenCookie(response, tokens.refreshToken);

    ResponseHelper.success(
      response,
      { accessToken: tokens.accessToken },
      'Mã truy cập đã được làm mới thành công',
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@Res() response: FastifyReply): void {
    // Clear refresh token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      path: '/',
    });

    ResponseHelper.success(response, null, 'Đăng xuất thành công');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(
    @Req() request: AuthenticatedRequest,
    @Res() response: FastifyReply,
  ): void {
    const { password, ...userWithoutPassword } = request.user as any;
    void password;

    ResponseHelper.success(
      response,
      userWithoutPassword,
      'Lấy thông tin hồ sơ thành công',
    );
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.authService.verifyEmail(verifyEmailDto);

    ResponseHelper.success(
      response,
      result,
      'Email đã được xác thực thành công',
    );
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.authService.resendVerification(resendDto);

    ResponseHelper.success(response, result, 'Email xác thực đã được gửi');
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.authService.forgotPassword(forgotPasswordDto);

    ResponseHelper.success(
      response,
      result,
      'Hướng dẫn đặt lại mật khẩu đã được gửi',
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.authService.resetPassword(resetPasswordDto);

    ResponseHelper.success(response, result, 'Đặt lại mật khẩu thành công');
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.authService.updateProfile(
      request.user.id,
      updateProfileDto,
    );

    ResponseHelper.success(response, result, 'Cập nhật hồ sơ thành công');
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: FastifyReply,
  ): Promise<void> {
    const result = await this.authService.changePassword(
      request.user.id,
      changePasswordDto,
    );

    ResponseHelper.success(response, result, 'Đổi mật khẩu thành công');
  }

  // Private helper methods

  private setRefreshTokenCookie(
    response: FastifyReply,
    refreshToken: string,
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    response.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict', // 'none' required for cross-site cookies in production
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });
  }
}
