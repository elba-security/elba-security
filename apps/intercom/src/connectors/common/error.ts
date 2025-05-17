import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type IntercomErrorOptions = { response?: Response };

export class IntercomError extends Error {
  response?: Response;

  constructor(message: string, { response }: IntercomErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'IntercomError';
  }
}

export class IntercomNotAdminError extends IntercomError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof IntercomError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof IntercomNotAdminError) {
    return 'not_admin';
  }

  return null;
};
