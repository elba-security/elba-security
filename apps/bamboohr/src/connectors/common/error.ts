import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type BamboohrErrorOptions = { response?: Response };

export class BamboohrError extends Error {
  response?: Response;

  constructor(message: string, { response }: BamboohrErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'BamboohrError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof BamboohrError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
