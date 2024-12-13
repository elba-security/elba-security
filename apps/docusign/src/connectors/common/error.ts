import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type DocusignErrorOptions = { response?: Response };

export class DocusignError extends Error {
  response?: Response;

  constructor(message: string, { response }: DocusignErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'DocusignError';
  }
}

export class DocusignNotAdminError extends DocusignError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof DocusignError && error.response?.status !== 401) {
    return 'unauthorized';
  }
  if (error instanceof DocusignNotAdminError) {
    return 'not_admin';
  }

  return null;
};
