import { AbilityFactory } from './ability.factory';
import { CaslGuard } from './casl.guard';
import { RoleGuard } from './role.guard';
import { Module } from '@nestjs/common';

@Module({
  providers: [AbilityFactory, CaslGuard, RoleGuard],
  exports: [AbilityFactory, CaslGuard, RoleGuard],
})
export class CaslModule {}
