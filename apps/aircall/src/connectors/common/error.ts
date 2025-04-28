import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type AircallErrorOptions = { response?: Response };

export class AircallError extends Error {
  response?: Response;

  constructor(message: string, { response }: AircallErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'AircallError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof AircallError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  return null;
};
