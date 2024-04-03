import { DropboxResponseError } from 'dropbox';
import { InngestMiddleware, RetryAfterError } from 'inngest';

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
            if (error instanceof DropboxResponseError && error.status === 429) {
              // eslint-disable-next-line -- Dbx error is unknown
              const { error: innerError } = error;
              // eslint-disable-next-line -- Dbx error is unknown
              const {
                error: { retry_after: retryAfter },
              } = innerError;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Dropbox rate limit reached by '${fn.name}', it will be retried after ${Number(
                      retryAfter
                    )} seconds.`,
                    Number(retryAfter) * 1000,
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
