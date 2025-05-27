import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof InstantlyError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
