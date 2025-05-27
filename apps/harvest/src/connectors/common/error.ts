import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type HarvestErrorOptions = { response?: Response };

export class HarvestError extends Error {
  response?: Response;

  constructor(message: string, { response }: HarvestErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'HarvestError';
  }
}

export class HarvestNotAdminError extends HarvestError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof HarvestError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof HarvestNotAdminError) {
    return 'not_admin';
  }

  return null;
};
