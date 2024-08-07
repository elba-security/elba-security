import { InngestMiddleware, RetryAfterError } from 'inngest';
import { DBXResponseError } from '@/connectors/dropbox/dbx-error';

export const rateLimitMiddleware = new InngestMiddleware({
  name: 'rate-limit',
  init: () => {
    return {
      onFunctionRun: ({ fn }) => {
        return {
          transformOutput: (ctx) => {
            const {
              result: { error, ...result },
              ...context
            } = ctx;
            if (error instanceof DBXResponseError && error.status === 429) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- safe to assume that the error object has the retry_after property
              const retryAfter: unknown = error.error?.error?.retry_after;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Dropbox rate limit reached by '${fn.name}', it will be retried after ${Number(
                      retryAfter
                    )} seconds.`,
                    Number(!retryAfter ? 60 : retryAfter) * 1000,
                    {
                      cause: error,
                    }
                  ),
                },
              };
            }
          },
        };
      },
    };
  },
});
