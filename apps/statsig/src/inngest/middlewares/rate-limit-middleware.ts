import { InngestMiddleware, RetryAfterError } from 'inngest';
import { StatsigError } from '@/connectors/common/error';

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

            if (!(error instanceof StatsigError)) {
              return;
            }

            // Statsig server is not handling rate limit properly
            // It is accepting heavy request and there is no sign of failure (it was tested with heavy api request)
            // However, we have configured rate limit with 60s for backup
            if (error.response?.status === 429) {
              const retryAfter = 60;

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
