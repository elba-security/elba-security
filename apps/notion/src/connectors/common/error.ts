import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type NotionErrorOptions = { response?: Response };

export class NotionError extends Error {
  response?: Response;

  constructor(message: string, { response }: NotionErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'NotionError';
  }
}

export class NotionNotAdminError extends NotionError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof NotionError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof NotionNotAdminError) {
    return 'not_admin';
  }

  return null;
};
