import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type ZoomErrorOptions = { response?: Response };

export class ZoomError extends Error {
  response?: Response;

  constructor(message: string, { response }: ZoomErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ZoomError';
  }
}

export class ZoomNotAdminError extends ZoomError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof ZoomError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ZoomNotAdminError) {
    return 'not_admin';
  }

  return null;
};
