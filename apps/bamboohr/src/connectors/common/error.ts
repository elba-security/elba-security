import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type BamboohrErrorOptions = { response?: Response };

export class BamboohrError extends Error {
  response?: Response;

  constructor(message: string, { response }: BamboohrErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'BamboohrError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof BamboohrError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
