import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type MiroErrorOptions = { response?: Response };

export class MiroError extends Error {
  response?: Response;

  constructor(message: string, { response }: MiroErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'MiroError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof MiroError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
