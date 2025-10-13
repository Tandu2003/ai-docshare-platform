import { AppError } from './app.error';

export class ValidationError extends AppError {
  public readonly errors: any;

  constructor(message: string = 'Xác thực thất bại', errors: any = null) {
    super(message, 422);
    this.errors = errors;
  }
}
