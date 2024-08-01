import { InngestMiddleware, RetryAfterError } from 'inngest';
import { ElasticError } from '@/connectors/common/error';

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

            if (error instanceof ElasticError && error.response?.status === 429) {
              const rateLimitReset = error.response.headers.get('X-RateLimit-Reset') || 60;

              let retryAfter = 60;

              if (rateLimitReset) {
                const resetDate = new Date(rateLimitReset);
                const currentTime = new Date();
                retryAfter = Math.max(
                  0,
                  Math.floor((resetDate.getTime() - currentTime.getTime()) / 1000)
                );
              }

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
