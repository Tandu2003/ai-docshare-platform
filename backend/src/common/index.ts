// Response interfaces
export * from './interfaces/api-response.interface';

// Constants
export * from './constants/http.constants';

// Errors
export * from './errors';

// Utils
export { ErrorUtils } from './utils/error.utils';

// Filters
export { GlobalExceptionFilter } from './filters/global-exception.filter';

// Response helpers
export { ResponseHelper } from './helpers/response.helper';
export { HttpErrorHelper } from './helpers/http-error.helper';

// Import for convenient exports
import { ResponseHelper } from './helpers/response.helper';
import { HttpErrorHelper } from './helpers/http-error.helper';

// Convenient exports for direct usage (with proper context binding)
export const success = ResponseHelper.success.bind(ResponseHelper);
export const created = ResponseHelper.created.bind(ResponseHelper);
export const updated = ResponseHelper.updated.bind(ResponseHelper);
export const deleted = ResponseHelper.deleted.bind(ResponseHelper);
export const paginated = ResponseHelper.paginated.bind(ResponseHelper);

export const badRequest = HttpErrorHelper.badRequest.bind(HttpErrorHelper);
export const unauthorized = HttpErrorHelper.unauthorized.bind(HttpErrorHelper);
export const forbidden = HttpErrorHelper.forbidden.bind(HttpErrorHelper);
export const notFound = HttpErrorHelper.notFound.bind(HttpErrorHelper);
export const validationError = HttpErrorHelper.validationError.bind(HttpErrorHelper);
export const conflict = HttpErrorHelper.conflict.bind(HttpErrorHelper);
export const tooManyRequests = HttpErrorHelper.tooManyRequests.bind(HttpErrorHelper);
export const internalError = HttpErrorHelper.internalError.bind(HttpErrorHelper);
