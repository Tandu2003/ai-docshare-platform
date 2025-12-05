import { Logger } from '@nestjs/common';

/**
 * Environment-aware logger utility
 * - Development: All logs (debug, log, warn, error)
 * - Production: Only warnings and errors
 */
export class LoggerUtils {
  /**
   * Check if current environment is development
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if current environment is production
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if debug logs should be shown
   */
  static shouldLogDebug(): boolean {
    return this.isDevelopment();
  }

  /**
   * Check if info/log messages should be shown
   */
  static shouldLogInfo(): boolean {
    return this.isDevelopment();
  }

  /**
   * Check if warning messages should be shown
   */
  static shouldLogWarn(): boolean {
    return true; // Always log warnings
  }

  /**
   * Check if error messages should be shown
   */
  static shouldLogError(): boolean {
    return true; // Always log errors
  }

  /**
   * Safe console.log wrapper - only logs in development
   */
  static consoleLog(...args: unknown[]): void {
    if (this.shouldLogInfo()) {
      console.log(...args);
    }
  }

  /**
   * Safe console.warn wrapper - always logs
   */
  static consoleWarn(...args: unknown[]): void {
    console.warn(...args);
  }

  /**
   * Safe console.error wrapper - always logs
   */
  static consoleError(...args: unknown[]): void {
    console.error(...args);
  }

  /**
   * Safe console.debug wrapper - only logs in development
   */
  static consoleDebug(...args: unknown[]): void {
    if (this.shouldLogDebug()) {
      console.debug(...args);
    }
  }
}

/**
 * Environment-aware Logger class that extends NestJS Logger
 */
export class AppLogger extends Logger {
  /**
   * Override log method to only log in development
   */
  override log(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogInfo()) {
      super.log(message, context);
    }
  }

  /**
   * Override debug method to only log in development
   */
  override debug(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogDebug()) {
      super.debug(message, context);
    }
  }

  /**
   * Override verbose method to only log in development
   */
  override verbose(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogDebug()) {
      super.verbose(message, context);
    }
  }

  /**
   * Warn always logs
   */
  override warn(message: unknown, context?: string): void {
    if (LoggerUtils.shouldLogWarn()) {
      super.warn(message, context);
    }
  }

  /**
   * Error always logs
   */
  override error(message: unknown, trace?: string, context?: string): void {
    if (LoggerUtils.shouldLogError()) {
      super.error(message, trace, context);
    }
  }
}
