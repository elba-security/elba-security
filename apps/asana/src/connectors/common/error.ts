import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type AsanaErrorOptions = { response?: Response };

export class AsanaError extends Error {
  response?: Response;

  constructor(message: string, { response }: AsanaErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'AsanaError';
  }
}

export class AsanaNotAdminError extends AsanaError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof AsanaError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof AsanaNotAdminError) {
    return 'not_admin';
  }

  return null;
};
