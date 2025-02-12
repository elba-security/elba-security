import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type ZendeskErrorOptions = { response?: Response };

export class ZendeskError extends Error {
  response?: Response;

  constructor(message: string, { response }: ZendeskErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ZendeskError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof ZendeskError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  return null;
};
