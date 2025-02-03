import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type BitbucketErrorOptions = { response?: Response };

export class BitbucketError extends Error {
  response?: Response;

  constructor(message: string, { response }: BitbucketErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'BitbucketError';
  }
}

export class BitbucketNotAdminError extends BitbucketError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof BitbucketError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof BitbucketNotAdminError) {
    return 'not_admin';
  }

  return null;
};
