import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type ConfluenceErrorOptions = { response?: Response };

export class ConfluenceError extends Error {
  response?: Response;

  constructor(message: string, { response }: ConfluenceErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ConfluenceError';
  }
}

export class ConfluenceNotAdminError extends ConfluenceError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof ConfluenceError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ConfluenceNotAdminError) {
    return 'not_admin';
  }

  return null;
};
