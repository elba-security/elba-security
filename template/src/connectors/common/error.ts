import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type ServiceErrorOptions = { response?: Response };

/**
 * Base error class for API-related errors. Extend this class for your specific API errors.
 * It includes support for the Response object to handle HTTP-specific error details.
 *
 * Example:
 * ```typescript
 * export class MyAPIError extends ServiceError {
 *   constructor(message: string, response?: Response) {
 *     super(message, { response });
 *     this.name = 'MyAPIError';
 *   }
 * }
 */
export class ServiceError extends Error {
  response?: Response;

  constructor(message: string, { response }: ServiceErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ServiceError';
  }
}

/**
 * Specific error class for when the authenticated user lacks admin privileges.
 * This is mapped to the 'not_admin' error type in mapElbaConnectionError.
 */
export class ServiceNotAdminError extends ServiceError {}

/**
 * Maps API errors to Elba connection error types.
 * This function handles common error cases:
 * - Nango 404: Maps to 'unauthorized' (typically means the connection was deleted)
 * - 401 responses: Maps to 'unauthorized' (invalid/expired credentials)
 * - Not admin errors: Maps to 'not_admin' (user lacks required privileges)
 *
 * Extend this function if you need to handle additional error types:
 * ```typescript
 * export const mapMyAPIConnectionError: MapConnectionErrorFn = (error) => {
 *   if (error instanceof MyAPIError) {
 *     if (error.response?.status === 403) return 'insufficient_permissions';
 *     if (error.response?.status === 401) return 'unauthorized';
 *   }
 *   return mapElbaConnectionError(error);
 * };
 */
export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof ServiceError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ServiceNotAdminError) {
    return 'not_admin';
  }

  return null;
};
