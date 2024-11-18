import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SumologicError } from '@/connectors/common/error';

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

            if (!(error instanceof SumologicError)) {
              return;
            }

            if (error.response?.status === 429) {
              const retryAfter = 60; // the response doesn't contain any details retry interval, so we use a default value of 60 seconds

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `API rate limit reached by '${fn.name}', retry after ${retryAfter} seconds.`,
                    `${retryAfter}s`,
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
