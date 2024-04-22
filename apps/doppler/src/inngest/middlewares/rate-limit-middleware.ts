import { InngestMiddleware, RetryAfterError } from 'inngest';
import { DopplerError } from '@/connectors/commons/error';

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
            if (error instanceof DopplerError && error.response?.status === 429) {
              const { headers } = error.response;
              const interval = parseInt(headers['x-ratelimit-interval'] as string, 10) ;
              const remaining = parseInt(headers['x-ratelimit-remaining'] as string, 10);

              // Calculate the time to retry based on rate limit data.
              const retryAfter = remaining === 0 ? interval : 0; // Only set retryAfter if no remaining quota.

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Rate limit exceeded for '${fn.name}'. Retry after ${retryAfter} seconds.`,
                    retryAfter,
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
