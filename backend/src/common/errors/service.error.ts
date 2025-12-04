import { AppError } from './app.error';

/**
 * HTTP Status codes for service errors
 */
const SERVICE_ERROR_CODES = {
  INTERNAL_SERVER: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Database error (500 Internal Server Error)
 *
 * Use when database operations fail.
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Thao tác cơ sở dữ liệu thất bại') {
    super(message, SERVICE_ERROR_CODES.INTERNAL_SERVER);
    this.name = 'DatabaseError';
  }
}

/**
 * External Service error (503 Service Unavailable)
 *
 * Use when external service calls fail.
 */
export class ExternalServiceError extends AppError {
  public readonly serviceName?: string;

  constructor(
    message: string = 'Dịch vụ bên ngoài không khả dụng',
    serviceName?: string,
  ) {
    super(message, SERVICE_ERROR_CODES.SERVICE_UNAVAILABLE);
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
  }

  /**
   * Convert error to JSON-serializable object including service name
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      serviceName: this.serviceName,
    };
  }
}
