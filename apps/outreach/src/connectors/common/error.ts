import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type OutreachErrorOptions = { response?: Response };

export class OutreachError extends Error {
  response?: Response;

  constructor(message: string, { response }: OutreachErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'OutreachError';
  }
}

export class OutreachNotAdminError extends OutreachError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof OutreachError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof OutreachNotAdminError) {
    return 'not_admin';
  }

  return null;
};
