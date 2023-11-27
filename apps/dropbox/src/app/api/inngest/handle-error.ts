import { DropboxResponseError } from 'dropbox';
import { RetryAfterError } from 'inngest';

export const handleError = (error: unknown) => {
  if (error instanceof DropboxResponseError) {
    const { status, headers } = error;

    if (status === 429) {
      const retryAfter = headers['Retry-After'] ?? 30;

      throw new RetryAfterError('Dropbox rate limit reached', retryAfter * 1000);
    }
    throw error;
  }
};
