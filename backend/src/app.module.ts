import { AuthModule } from '@/auth/auth.module'
import { DatabaseInitService, GlobalExceptionFilter } from '@/common'
import { CaslModule } from '@/common/casl'
import { ConfigModule } from '@/config/config.module'
// import { DocumentModule } from '@/document/document.module';
import { DocumentsModule } from '@/documents/documents.module'
import { FilesModule } from '@/files/files.module'
import { HealthModule } from '@/health/health.module'
import { PrismaModule } from '@/prisma/prisma.module'
// import { UploadModule } from '@/upload/upload.module';
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { CaslGuard } from '@/common/casl'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    CaslModule,
    // UploadModule,
    // DocumentModule,
    FilesModule,
    DocumentsModule,
  ],
  controllers: [],
  providers: [
    // Global Exception Filter as provider
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global CASL Guard as provider
    {
      provide: APP_GUARD,
      useClass: CaslGuard,
    },
    // Database initialization service
    DatabaseInitService,
  ],
})
export class AppModule {}
