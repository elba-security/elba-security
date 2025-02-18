import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type AsanaErrorOptions = { response?: Response };

export class AsanaError extends Error {
  response?: Response;

  constructor(message: string, { response }: AsanaErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'AsanaError';
  }
}

export class AsanaNotAdminError extends AsanaError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof AsanaError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof AsanaNotAdminError) {
    return 'not_admin';
  }

  return null;
};
