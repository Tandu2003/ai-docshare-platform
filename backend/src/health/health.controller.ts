import { internalError, notFound, success } from '@/common';
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('health')
export class HealthController {
  @Get()
  healthCheck(@Res() res: Response) {
    return success(
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
