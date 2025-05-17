import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof RampError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
