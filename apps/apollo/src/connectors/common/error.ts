import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type ApolloErrorOptions = { response?: Response };

export class ApolloError extends Error {
  response?: Response;

  constructor(message: string, { response }: ApolloErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ApolloError';
  }
}

export class ApolloNotAdminError extends ApolloError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof ApolloError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ApolloNotAdminError) {
    return 'not_admin';
  }

  return null;
};
