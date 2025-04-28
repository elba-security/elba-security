import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type BillErrorOptions = { response?: Response };

export class BillError extends Error {
  response?: Response;

  constructor(message: string, { response }: BillErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'BillError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof BillError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
