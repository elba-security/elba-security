type MicrosoftOptions = { response?: Response };

export class MicrosoftError extends Error {
  response?: Response;

  constructor(message: string, { response }: MicrosoftOptions = {}) {
    super(message);
    this.response = response;
  }
}

export const isUnauthorizedError = (error: unknown) =>
  error instanceof MicrosoftError && error.response?.status === 401;

export const getErrorRetryAfter = (error: unknown) => {
  if (error instanceof MicrosoftError) {
    return error.response?.headers.get('Retry-After');
  }
};
