import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type DatadogErrorOptions = { response?: Response };

export class DatadogError extends Error {
  response?: Response;

  constructor(message: string, { response }: DatadogErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'DatadogError';
  }
}

export class DatadogNotAdminError extends DatadogError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof DatadogError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof DatadogNotAdminError) {
    return 'not_admin';
  }

  return null;
};
