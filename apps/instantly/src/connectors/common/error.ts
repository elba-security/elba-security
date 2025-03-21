import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type InstantlyErrorOptions = { response?: Response };

export class InstantlyError extends Error {
  response?: Response;

  constructor(message: string, { response }: InstantlyErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'InstantlyError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof InstantlyError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
