import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

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
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof PagerdutyError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof PagerdutyNotAdminError) {
    return 'not_admin';
  }

  return null;
};
