import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type FrontErrorOptions = { response?: Response };

export class FrontError extends Error {
  response?: Response;

  constructor(message: string, { response }: FrontErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'FrontError';
  }
}

export class FrontNotAdminError extends FrontError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof FrontError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof FrontNotAdminError) {
    return 'not_admin';
  }

  return null;
};
