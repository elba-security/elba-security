import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type SendgridErrorOptions = { response?: Response };

export class SendgridError extends Error {
  response?: Response;

  constructor(message: string, { response }: SendgridErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'SendgridError';
  }
}

export class SendgridNotAdminError extends SendgridError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof SendgridError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof SendgridNotAdminError) {
    return 'not_admin';
  }

  return null;
};
