import { type MapConnectionErrorFn } from '@elba-security/inngest';
import { IntegrationConnectionError } from '@elba-security/common';

type OpenAiErrorOptions = { response?: Response };

export class OpenAiError extends Error {
  response?: Response;

  constructor(message: string, { response }: OpenAiErrorOptions = {}) {
    super(message);
    this.response = response;
    this.name = 'OpenAiError';
  }
}

export const mapElbaConnectionError: MapConnectionErrorFn = (error) => {
  if (error instanceof IntegrationConnectionError) {
    return error.type;
  }
  if (error instanceof OpenAiError && error.response?.status === 401) {
    return 'unauthorized';
  }

  return null;
};
