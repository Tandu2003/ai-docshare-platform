// Base error class
export { AppError } from './app.error';

// Validation errors
export { ValidationError } from './validation.error';

// Authentication & Authorization errors
export { AuthenticationError, AuthorizationError } from './auth.error';

// HTTP errors
export { NotFoundError, ConflictError, RateLimitError } from './http.error';

// Service errors
export { DatabaseError, ExternalServiceError } from './service.error';
