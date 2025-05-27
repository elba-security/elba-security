import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type GongErrorOptions = { response?: Response };

export class GongError extends Error {
  response?: Response;

  constructor(message: string, { response }: GongErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'GongError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof GongError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
