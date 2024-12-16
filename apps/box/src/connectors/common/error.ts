import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type BoxErrorOptions = { response?: Response };

export class BoxError extends Error {
  response?: Response;

  constructor(message: string, { response }: BoxErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'BoxError';
  }
}

export class BoxNotAdminError extends BoxError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof BoxError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof BoxNotAdminError) {
    return 'not_admin';
  }

  return null;
};
