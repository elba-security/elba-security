import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type FreshdeskErrorOptions = { response?: Response };

export class FreshdeskError extends Error {
  response?: Response;

  constructor(message: string, { response }: FreshdeskErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'FreshdeskError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof FreshdeskError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
