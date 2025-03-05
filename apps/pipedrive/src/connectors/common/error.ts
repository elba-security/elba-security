import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type PipedriveErrorOptions = { response?: Response };

export class PipedriveError extends Error {
  response?: Response;

  constructor(message: string, { response }: PipedriveErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'PipedriveError';
  }
}

export class PipedriveNotAdminError extends PipedriveError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof PipedriveError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof PipedriveNotAdminError) {
    return 'not_admin';
  }

  return null;
};
