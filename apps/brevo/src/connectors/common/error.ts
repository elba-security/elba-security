import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type BrevoErrorOptions = { response?: Response };

export class BrevoError extends Error {
  response?: Response;

  constructor(message: string, { response }: BrevoErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'BrevoError';
  }
}

export class BrevoNotAdminError extends BrevoError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof BrevoError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof BrevoNotAdminError) {
    return 'not_admin';
  }

  return null;
};
