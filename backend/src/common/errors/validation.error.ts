import { AppError } from './app.error';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}
export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[] | null;
  constructor(
    message: string = 'Xác thực thất bại',
    errors: ValidationErrorDetail[] | null = null,
  ) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}
