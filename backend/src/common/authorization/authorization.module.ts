import { RoleGuard } from './role.guard';
import { Module } from '@nestjs/common';

@Module({
  providers: [RoleGuard],
  exports: [RoleGuard],
})
export class AuthorizationModule {}
