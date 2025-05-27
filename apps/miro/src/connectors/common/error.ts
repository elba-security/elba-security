import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof MiroError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
