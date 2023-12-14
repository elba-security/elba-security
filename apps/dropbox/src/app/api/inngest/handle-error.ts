import { DropboxResponseError } from 'dropbox';
import { NonRetriableError, RetryAfterError } from 'inngest';

export const handleError = (error: unknown) => {
  if (error instanceof DropboxResponseError) {
    const { status, error: innerError } = error;

    if (status === 401) {
      const { error_summary, error: errorTag } = innerError;

      if (
        [
          'invalid_access_token',
          'missing_scope',
          'expired_access_token',
          'invalid_select_admin',
        ].includes(errorTag['.tag'])
      ) {
        throw new NonRetriableError(error_summary, { cause: error });
      }
    }

    if (status === 429) {
      const { retry_after } = innerError;

      throw new RetryAfterError('Dropbox rate limit reached', (retry_after ?? 10) * 1000);
    }

    throw error;
  }
};
