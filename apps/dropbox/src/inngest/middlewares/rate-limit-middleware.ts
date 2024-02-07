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

            if (
              error instanceof DropboxResponseError &&
              error.error.error['.tag'] === 'too_many_requests'
            ) {
              const { error: innerError } = error;
              const {
                error: { retry_after: retryAfter },
              } = innerError;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Dropbox rate limit reached by '${fn.name}'`,
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
