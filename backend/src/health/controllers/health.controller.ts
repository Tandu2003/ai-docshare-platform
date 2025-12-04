import { ResponseHelper } from '@/common';
import { Controller, Get, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Controller('health')
export class HealthController {
  @Get()
  healthCheck(@Res() res: FastifyReply) {
    return ResponseHelper.success(
      res,
      {
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'AI DocShare Platform',
        version: '1.0.0',
      },
      'Service is healthy',
    );
  }
}
