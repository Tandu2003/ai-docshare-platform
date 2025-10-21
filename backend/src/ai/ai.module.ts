import { CaslModule } from '../common/casl/casl.module';
import { SystemSettingsService } from '../common/system-settings.service';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { ContentExtractorService } from './content-extractor.service';
import { GeminiService } from './gemini.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, PrismaModule, FilesModule, CaslModule],
  controllers: [AIController],
  providers: [
    AIService,
    GeminiService,
    ContentExtractorService,
    SystemSettingsService,
  ],
  exports: [AIService, GeminiService, ContentExtractorService],
})
export class AIModule {}
