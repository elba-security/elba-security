import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type AircallErrorOptions = { response?: Response };

export class AircallError extends Error {
  response?: Response;

  constructor(message: string, { response }: AircallErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'AircallError';
  }
}

export class AircallNotAdminError extends AircallError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof AircallError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof AircallNotAdminError) {
    return 'not_admin';
  }

  return null;
};
