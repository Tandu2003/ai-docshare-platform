import { AppModule } from '@/app.module';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

async function bootstrap() {
  // Configure logger based on environment
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logger: Array<'log' | 'error' | 'warn' | 'debug' | 'verbose'> =
    isDevelopment
      ? ['log', 'error', 'warn', 'debug', 'verbose']
      : ['error', 'warn'];

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
    }),
    {
      logger,
    },
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();

  // Security middleware
  await fastifyInstance.register(helmet, {
    contentSecurityPolicy: false, // Disable for development, enable in production
  });

  // Cookie parser
  await fastifyInstance.register(fastifyCookie);

  // Multipart/form-data support for file uploads
  await fastifyInstance.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 10,
    },
    attachFieldsToBody: false,
  });

  // CORS configuration
  await fastifyInstance.register(cors, {
    origin: (origin, callback) => {
      // Allow all origins in development
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }

      // In production, check against allowed origins
      const corsOrigin = process.env.CORS_ORIGIN;
      let allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://localhost:3000',
        'https://localhost:5173',
      ];

      if (corsOrigin) {
        // Remove spaces and split by comma
        allowedOrigins = corsOrigin.replace(/\s+/g, '').split(',');
      }

      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Set-Cookie'],
    credentials: true,
    preflight: true,
    strictPreflight: false,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  const port = process.env.PORT ?? 8080;

  // Log startup info only in development
  if (isDevelopment) {
    const logger = new Logger('Bootstrap');
    logger.log(`Application starting on port ${port}`);
    logger.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  }

  await app.listen(port, '0.0.0.0');
}

bootstrap().catch(() => {
  process.exit(1);
});
