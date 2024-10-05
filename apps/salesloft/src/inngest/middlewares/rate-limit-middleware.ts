import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SalesloftError } from '@/connectors/common/error';

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

            if (!(error instanceof SalesloftError)) {
              return;
            }

            if (error.response?.status === 429) {
              const retryAfterHeader = error.response.headers.get('x-ratelimit-limit-minute');
              let retryAfter = 60;
              if (retryAfterHeader) {
                retryAfter = parseInt(retryAfterHeader, 10) * 60;
              }
              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Rate limit exceeded for '${fn.name}'. Retry after ${retryAfter} seconds.`,
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
