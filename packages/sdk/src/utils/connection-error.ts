import { type ConnectionErrorType } from '@elba-security/schemas';
import { NangoConnectionError } from '@elba-security/nango';

type IntegrationError = Error & {
  response?: Response & { status?: number };
  code?: ConnectionErrorType;
};

export type IntegrationErrorClass<T extends IntegrationError> = new (...args: unknown[]) => T;

export function mapElbaConnectionError<T extends IntegrationError>(
  errorClass: IntegrationErrorClass<T>,
  error: unknown
): ConnectionErrorType | null {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }

  if (error instanceof errorClass) {
    if (error.code) {
      return error.code;
    }

    if (error.response?.status !== 401) {
      return 'unauthorized';
    }
  }

  return null;
}
