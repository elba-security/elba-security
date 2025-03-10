import { InngestMiddleware, RetryAfterError } from 'inngest';
import { MiroError } from '@/connectors/common/error';

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

            if (!(error instanceof MiroError)) {
              return;
            }

            if (error.response?.status === 429) {
              const headers = error.response.headers;
              let retryAfter = 60;

              // Check for x-ratelimit-reset
              const resetTimestamp = headers.get('x-ratelimit-reset');
              if (resetTimestamp) {
                const resetTime = parseInt(resetTimestamp, 10);
                if (!isNaN(resetTime)) {
                  const currentTime = Math.floor(Date.now() / 1000);
                  retryAfter = Math.max(0, resetTime - currentTime);
                }
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Miro rate limit reached by '${fn.name}'`,
                    `${retryAfter}s`,
                    { cause: error }
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
