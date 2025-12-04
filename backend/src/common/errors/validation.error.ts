import { AppError } from './app.error';

/**
 * Validation error details interface
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation error (422 Unprocessable Entity)
 *
 * Use when input validation fails.
 */
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

  /**
   * Convert error to JSON-serializable object including validation details
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}
