import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type MetabaseErrorOptions = { response?: Response };

export class MetabaseError extends Error {
  response?: Response;

  constructor(message: string, { response }: MetabaseErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'MetabaseError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof MetabaseError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
