import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

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
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof SendgridError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof SendgridNotAdminError) {
    return 'not_admin';
  }

  return null;
};
