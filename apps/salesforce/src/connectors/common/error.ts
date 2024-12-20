import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type SalesforceErrorOptions = { response?: Response };

export class SalesforceError extends Error {
  response?: Response;

  constructor(message: string, { response }: SalesforceErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'SalesforceError';
  }
}

export class SalesforceNotAdminError extends SalesforceError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof SalesforceError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof SalesforceNotAdminError) {
    return 'not_admin';
  }

  return null;
};
