import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type ClickUpErrorOptions = { response?: Response };

export class ClickUpError extends Error {
  response?: Response;

  constructor(message: string, { response }: ClickUpErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'ClickUpError';
  }
}

export class ClickUpMultipleWorkspaceError extends ClickUpError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof ClickUpError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof ClickUpMultipleWorkspaceError) {
    return 'multiple_workspaces_not_supported';
  }

  return null;
};
