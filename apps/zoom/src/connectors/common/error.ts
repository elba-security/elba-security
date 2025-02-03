import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

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
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof ZoomError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ZoomNotAdminError) {
    return 'not_admin';
  }

  return null;
};
