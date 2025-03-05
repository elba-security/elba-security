import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type PagerdutyErrorOptions = { response?: Response };

export class PagerdutyError extends Error {
  response?: Response;

  constructor(message: string, { response }: PagerdutyErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'PagerdutyError';
  }
}

export class PagerdutyNotAdminError extends PagerdutyError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof PagerdutyError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof PagerdutyNotAdminError) {
    return 'not_admin';
  }

  return null;
};
