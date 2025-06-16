import { IntegrationConnectionError } from '@elba-security/common';

export class TypeformConnectionError extends IntegrationConnectionError {
  constructor(
    type:
      | 'unauthorized'
      | 'not_admin'
      | 'unknown'
      | 'unsupported_plan'
      | 'multiple_workspaces_not_supported',
    message: string
  ) {
    super(message, { type });
  }
}
