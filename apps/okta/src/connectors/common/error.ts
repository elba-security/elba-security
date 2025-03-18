import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

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
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof OktaError && error.response?.status === 401) {
    return 'unauthorized';
  }
  return null;
};
