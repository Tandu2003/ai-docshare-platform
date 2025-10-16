import { AbilityFactory } from './ability.factory';
import { CaslGuard } from './casl.guard';
import { Module } from '@nestjs/common';

@Module({
  providers: [AbilityFactory, CaslGuard],
  exports: [AbilityFactory, CaslGuard],
})
export class CaslModule {}
