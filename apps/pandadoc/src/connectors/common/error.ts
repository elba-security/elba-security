import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof PandadocError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
