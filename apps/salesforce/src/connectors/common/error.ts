import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type SalesforceErrorOptions = { response?: Response };

export class SalesforceError extends Error {
  response?: Response;

  constructor(message: string, { response }: SalesforceErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'SalesforceError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof SalesforceError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
