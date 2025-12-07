import { AppLogger } from '../utils/logger.utils';
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: AppLogger;
  constructor(context?: string) {
    this.logger = new AppLogger(context || 'AppLogger');
  }
  log(message: unknown, context?: string): void {
    this.logger.log(message, context);
  }
  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn(message, context);
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug(message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.logger.verbose(message, context);
  }
}
