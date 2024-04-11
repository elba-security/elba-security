import { InngestMiddleware, RetryAfterError } from 'inngest';
import { ElasticError } from '@/connectors/commons/error';

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

            // Check if the error is a rate limit error (HTTP Status 429)
            if (error instanceof ElasticError && error.response?.status === 429) {
              // Extract rate limit headers
              const interval = error.response.headers['x-ratelimit-interval'] as string;
              const remainingStr = error.response.headers['x-ratelimit-remaining'] as string;
              const remaining = parseInt(remainingStr, 10);

              // Calculate retry after duration based on the rate limit headers
              // This is a simplified approach; adjust logic based on actual rate limit policy details
              const retryAfter = remaining === 0 ? parseInt(interval, 10) : 0; // Retry after the interval if no remaining calls

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(`Rate limit exceeded for '${fn.name}'. Retry after ${retryAfter} seconds.`, retryAfter, {
                    cause: error,
                  }),
                },
              };
            }
          },
        };
      },
    };
  },
});
