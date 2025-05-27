import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type DialpadErrorOptions = { response?: Response };

export class DialpadError extends Error {
  response?: Response;

  constructor(message: string, { response }: DialpadErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'DialpadError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof DialpadError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
