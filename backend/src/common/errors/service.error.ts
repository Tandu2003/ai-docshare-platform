import { AppError } from './app.error';

const SERVICE_ERROR_CODES = {
  INTERNAL_SERVER: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
export class DatabaseError extends AppError {
  constructor(message: string = 'Thao tác cơ sở dữ liệu thất bại') {
    super(message, SERVICE_ERROR_CODES.INTERNAL_SERVER);
    this.name = 'DatabaseError';
  }
}
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

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      serviceName: this.serviceName,
    };
  }
}
