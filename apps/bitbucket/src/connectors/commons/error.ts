import type { ZodError } from 'zod';

type BitbucketErrorOptions = { response?: Response; error?: Error | ZodError };

export class BitbucketError extends Error {
  response?: Response;
  error?: Error | ZodError;

  constructor(message: string, { response, error }: BitbucketErrorOptions = {}) {
    super(message);
    this.response = response;
    this.cause = error;
  }
}
