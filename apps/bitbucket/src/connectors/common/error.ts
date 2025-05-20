import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof BitbucketError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof BitbucketNotAdminError) {
    return 'not_admin';
  }

  return null;
};
