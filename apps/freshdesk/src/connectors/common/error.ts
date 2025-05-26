import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof FreshdeskError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
