import { InngestMiddleware, RetryAfterError } from 'inngest';
import { ZoomError } from '@/connectors/commons/error';

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

            if (!(error instanceof ZoomError)) {
              // Adjust based on actual error handling
              return;
            }

            if (error.response?.status === 429) {
              let retryAfter = 60;
              const retryAfterHeader = error.response.headers.get('retry-after');
              if (retryAfterHeader) {
                retryAfter = parseInt(retryAfterHeader, 10);
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `API rate limit reached by '${fn.name}', retry after ${retryAfter} seconds.`,
                    retryAfter.toString(),
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
