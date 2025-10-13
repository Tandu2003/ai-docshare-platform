import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from './dto';
import { JwtPayload, AuthTokens, LoginResponse, AuthUser } from './interfaces';
import { AuthenticationError } from '@/common/errors';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;
  private readonly defaultRoleName = 'user';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, username, password, firstName, lastName } = registerDto;

    try {
      // Check if email or username already exists
      await this.validateUniqueUser(email, username);

      // Get default role
      const defaultRole = await this.getDefaultRole();

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Generate verification token (sử dụng resetToken field tạm thời)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          firstName,
          lastName,
          roleId: defaultRole.id,
          resetToken: verificationToken, // Sử dụng resetToken cho verification tạm thời
          resetExpires: verificationExpires,
        },
      });

      // Send verification email
      await this.mailService.sendVerificationEmail({
        firstName: user.firstName,
        email: user.email,
        verificationToken,
      });

      return {
        message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new AuthenticationError('Đăng ký thất bại');
    }
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { emailOrUsername, password } = loginDto;

    try {
      // Find user by email or username
      const user = await this.findUserByEmailOrUsername(emailOrUsername);

      if (!user) {
        throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
      }

      // Check user status
      this.validateUserStatus(user);

      // Update last login
      await this.updateLastLogin(user.id);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return this.formatLoginResponse(user, tokens);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new AuthenticationError('Đăng nhập thất bại');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Mã làm mới không hợp lệ');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Mã làm mới không hợp lệ');
    }
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(payload: JwtPayload): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  // Private helper methods

  private async validateUniqueUser(email: string, username: string): Promise<void> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email đã tồn tại');
      }
      if (existingUser.username === username) {
        throw new ConflictException('Tên người dùng đã tồn tại');
      }
    }
  }

  private async getDefaultRole() {
    const role = await this.prisma.role.findUnique({
      where: { name: this.defaultRoleName },
    });

    if (!role) {
      throw new BadRequestException('Vai trò mặc định không tìm thấy');
    }

    return role;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private async findUserByEmailOrUsername(emailOrUsername: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });
  }

  private validateUserStatus(user: any): void {
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // Check if email verification is required
    if (!user.isVerified) {
      throw new UnauthorizedException('Vui lòng xác thực địa chỉ email trước khi đăng nhập');
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  private async generateTokens(user: any): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roleId: user.roleId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private formatLoginResponse(user: any, tokens: AuthTokens): LoginResponse {
    const { password, ...userWithoutPassword } = user;
    void password;

    return {
      user: {
        ...userWithoutPassword,
        role: {
          name: user.role.name,
          permissions: Array.isArray(user.role.permissions)
            ? user.role.permissions
            : JSON.parse(user.role.permissions || '[]'),
        },
      },
      tokens,
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    const { token } = verifyEmailDto;

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          resetToken: token, // Sử dụng resetToken cho verification
          resetExpires: {
            gt: new Date(),
          },
          isVerified: false,
        },
      });

      if (!user) {
        throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn');
      }

      // Update user as verified and clear token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          resetToken: null,
          resetExpires: null,
        },
      });

      // Send welcome email
      await this.mailService.sendWelcomeEmail({
        firstName: user.firstName,
        email: user.email,
      });

      return {
        message: 'Email đã được xác thực thành công! Chào mừng bạn đến với AI DocShare Platform.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new AuthenticationError('Xác thực email thất bại');
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(resendDto: ResendVerificationDto): Promise<{ message: string }> {
    const { email } = resendDto;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng, vui lòng đăng ký trước');
      }

      if (user.isVerified) {
        throw new BadRequestException('Email đã được xác thực, vui lòng đăng nhập');
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: verificationToken,
          resetExpires: verificationExpires,
        },
      });

      // Send verification email
      await this.mailService.sendVerificationEmail({
        firstName: user.firstName,
        email: user.email,
        verificationToken,
      });

      return {
        message: 'Email xác thực đã được gửi thành công! Vui lòng kiểm tra hộp thư.',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new AuthenticationError('Gửi lại email xác thực thất bại');
    }
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new BadRequestException('Không tìm thấy tài khoản, vui lòng đăng ký trước');
      }

      if (!user.isVerified) {
        throw new BadRequestException('Vui lòng xác thực địa chỉ email trước');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetExpires,
        },
      });

      // Send password reset email
      await this.mailService.sendPasswordResetEmail({
        firstName: user.firstName,
        email: user.email,
        resetToken,
      });

      return {
        message: 'Hướng dẫn đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new AuthenticationError('Xử lý yêu cầu đặt lại mật khẩu thất bại');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password } = resetPasswordDto;

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          resetToken: token,
          resetExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(password);

      // Update user with new password and clear reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetExpires: null,
        },
      });

      // Send confirmation email
      await this.mailService.sendPasswordResetConfirmationEmail({
        firstName: user.firstName,
        email: user.email,
      });

      return {
        message: 'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new AuthenticationError('Đặt lại mật khẩu thất bại');
    }
  }
}
