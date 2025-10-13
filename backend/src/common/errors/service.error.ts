import { AppError } from './app.error';

export class DatabaseError extends AppError {
  constructor(message: string = 'Thao tác cơ sở dữ liệu thất bại') {
    super(message, 500);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'Dịch vụ bên ngoài không khả dụng') {
    super(message, 503);
  }
}
