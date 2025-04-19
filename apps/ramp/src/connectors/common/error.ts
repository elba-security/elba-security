import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type RampErrorOptions = { response?: Response };

export class RampError extends Error {
  response?: Response;

  constructor(message: string, { response }: RampErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'RampError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof RampError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
