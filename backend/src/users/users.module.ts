import { UsersController } from './controllers/users.controller';
import { UsersService } from './users.service';
import { AuthorizationModule } from '@/common/authorization';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
