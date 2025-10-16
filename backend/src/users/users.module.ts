import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CaslModule } from '@/common/casl/casl.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule, CaslModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
