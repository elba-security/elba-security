import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type CalendlyErrorOptions = { response?: Response };

export class CalendlyError extends Error {
  response?: Response;

  constructor(message: string, { response }: CalendlyErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'CalendlyError';
  }
}

export class CalendlyNotAdminError extends CalendlyError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof CalendlyError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof CalendlyNotAdminError) {
    return 'not_admin';
  }

  return null;
};
