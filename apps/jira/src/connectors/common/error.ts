import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type JiraErrorOptions = { response?: Response };

export class JiraError extends Error {
  response?: Response;

  constructor(message: string, { response }: JiraErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'JiraError';
  }
}

export class JiraNotAdminError extends JiraError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof JiraError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof JiraNotAdminError) {
    return 'not_admin';
  }

  return null;
};
