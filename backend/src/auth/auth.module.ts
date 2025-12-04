import { AuthController } from './controllers/auth.controller';
import { AuthService } from './auth.service';
import { RoleController } from './controllers/role.controller';
import { RoleService } from './role.service';
import { JwtStrategy } from './strategies';
import { AuthorizationModule } from '@/common/authorization';
import { MailModule } from '@/mail/mail.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => [
        {
          name: 'short',
          ttl: 1000,
          limit: 3,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: 20,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: 100,
        },
      ],
      inject: [ConfigService],
    }),
    PrismaModule,
    MailModule,
    AuthorizationModule,
  ],
  controllers: [AuthController, RoleController],
  providers: [AuthService, JwtStrategy, RoleService],
  exports: [AuthService, JwtStrategy, PassportModule, RoleService],
})
export class AuthModule {}
