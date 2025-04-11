import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

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
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof MetabaseError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
