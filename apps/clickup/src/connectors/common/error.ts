import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type ClickUpErrorOptions = { response?: Response };

export class ClickUpError extends Error {
  response?: Response;

  constructor(message: string, { response }: ClickUpErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ClickUpError';
  }
}

export class ClickUpNotAdminError extends ClickUpError {}

export class ClickUpMultipleWorkspaceError extends ClickUpError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof ClickUpError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ClickUpNotAdminError) {
    return 'not_admin';
  }

  return null;
};
