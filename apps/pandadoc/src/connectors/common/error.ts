import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type PandadocErrorOptions = { response?: Response };

export class PandadocError extends Error {
  response?: Response;

  constructor(message: string, { response }: PandadocErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'PandadocError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof PandadocError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
