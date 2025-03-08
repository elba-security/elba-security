import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type MuralErrorOptions = { response?: Response };

export class MuralError extends Error {
  response?: Response;

  constructor(message: string, { response }: MuralErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'MuralError';
  }
}

export class MuralMultipleWorkspaceError extends MuralError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof MuralError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof MuralMultipleWorkspaceError) {
    return 'multiple_workspaces_not_supported';
  }

  return null;
};
