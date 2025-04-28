import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof ApolloError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ApolloNotAdminError) {
    return 'not_admin';
  }

  return null;
};
