import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type LinearErrorOptions = { response?: Response };

export class LinearError extends Error {
  response?: Response;

  constructor(message: string, { response }: LinearErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'LinearError';
  }
}

export class LinearNotAdminError extends LinearError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof LinearError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof LinearNotAdminError) {
    return 'not_admin';
  }

  return null;
};
