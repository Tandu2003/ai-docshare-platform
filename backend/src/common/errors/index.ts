/**
 * Error Classes - Domain-specific errors following Clean Code Commandment #9
 *
 * "Fail loudly and clearly" - All errors should be explicit and meaningful.
 */

// Base error class
export { AppError } from './app.error';

// Validation errors
export { ValidationError } from './validation.error';
export type { ValidationErrorDetail } from './validation.error';

// Authentication & Authorization errors
export { AuthenticationError, AuthorizationError } from './auth.error';

// HTTP errors
export { NotFoundError, ConflictError, RateLimitError } from './http.error';

// Service errors
export { DatabaseError, ExternalServiceError } from './service.error';
