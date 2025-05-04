import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type DiscourseErrorOptions = { response?: Response };

export class DiscourseError extends Error {
  response?: Response;

  constructor(message: string, { response }: DiscourseErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'DiscourseError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof DiscourseError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
