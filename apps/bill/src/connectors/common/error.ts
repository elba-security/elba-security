import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof BillError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
