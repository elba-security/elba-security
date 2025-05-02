import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type HubspotErrorOptions = { response?: Response };

export class HubspotError extends Error {
  response?: Response;

  constructor(message: string, { response }: HubspotErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'HubspotError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof HubspotError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
