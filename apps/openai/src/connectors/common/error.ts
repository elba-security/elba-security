import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { NangoConnectionError } from '@elba-security/nango';

type OpenAiErrorOptions = { response?: Response };

export class OpenAiError extends Error {
  response?: Response;

  constructor(message: string, { response }: OpenAiErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'OpenAiError';
  }
}

export class OpenAiNotAdminError extends OpenAiError {}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof NangoConnectionError && error.response.status === 404) {
    return 'unauthorized';
  }
  if (error instanceof OpenAiError && error.response?.status === 401) {
    return 'unauthorized';
  }
  if (error instanceof OpenAiNotAdminError) {
    return 'not_admin';
  }

  return null;
};
