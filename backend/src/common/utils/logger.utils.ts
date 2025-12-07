import { Logger } from '@nestjs/common';

export class LoggerUtils {
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static shouldLogDebug(): boolean {
    return this.isDevelopment();
  }

  static shouldLogInfo(): boolean {
    return this.isDevelopment();
  }

  static shouldLogWarn(): boolean {
    return true; // Always log warnings
  }

  static shouldLogError(): boolean {
    return true; // Always log errors
  }

  static consoleLog(...args: unknown[]): void {
    if (this.shouldLogInfo()) {
      console.log(...args);
    }
  }

  static consoleWarn(...args: unknown[]): void {
    console.warn(...args);
  }

  static consoleError(...args: unknown[]): void {
    console.error(...args);
  }

  static consoleDebug(...args: unknown[]): void {
    if (this.shouldLogDebug()) {
      console.debug(...args);
    }
  }
}

export class AppLogger extends Logger {
  override log(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogInfo()) {
      super.log(message, context);
    }
  }

  override debug(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogDebug()) {
      super.debug(message, context);
    }
  }

  override verbose(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogDebug()) {
      super.verbose(message, context);
    }
  }

  override warn(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogWarn()) {
      super.warn(message, context);
    }
  }

  override error(message: unknown, trace?: string, context?: string): void {
    if (LoggerUtils.shouldLogError()) {
      super.error(message, trace, context);
    }
  }
}
