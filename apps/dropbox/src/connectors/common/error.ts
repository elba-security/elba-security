import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

export class DropboxError extends Error {
  response?: Response;

  constructor(message: string, { response }: DropboxErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'DropboxError';
  }
}
type DropboxErrorOptions = { response?: Response };


export class DropboxNotAdminError extends DropboxError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof DropboxError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof DropboxNotAdminError) {
    return 'not_admin';
  }

  return null;
};
