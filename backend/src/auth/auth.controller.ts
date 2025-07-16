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
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtAuthGuard } from './guards';
import { AuthUser } from './interfaces';
import { ResponseHelper } from '../common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async register(@Body() registerDto: RegisterDto, @Res() response: Response): Promise<void> {
    const result = await this.authService.register(registerDto);

    // Set refresh token as httpOnly cookie
    this.setRefreshTokenCookie(response, result.tokens.refreshToken);

    // Return user data and access token
    ResponseHelper.created(
      response,
      {
        user: result.user,
        accessToken: result.tokens.accessToken,
      },
      'Registration successful'
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
