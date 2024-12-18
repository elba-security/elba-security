import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type HubspotErrorOptions = { response?: Response };

export class HubspotError extends Error {
  response?: Response;

  constructor(message: string, { response }: HubspotErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'HubspotError';
  }
}

export class HubspotNotAdminError extends HubspotError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof HubspotError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof HubspotNotAdminError) {
    return 'not_admin';
  }

  return null;
};
