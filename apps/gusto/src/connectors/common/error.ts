import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type GustoErrorOptions = { response?: Response };

export class GustoError extends Error {
  response?: Response;

  constructor(message: string, { response }: GustoErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'GustoError';
  }
}

export class GustoNotAdminError extends GustoError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof GustoError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof GustoNotAdminError) {
    return 'not_admin';
  }

  return null;
};
