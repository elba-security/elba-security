import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type OktaErrorOptions = { response?: Response };

export class OktaError extends Error {
  response?: Response;

  constructor(message: string, { response }: OktaErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'OktaError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof OktaError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
