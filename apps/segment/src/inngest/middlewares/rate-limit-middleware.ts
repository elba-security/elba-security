import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SegmentError } from '@/connectors/commons/error';

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
            if (error instanceof SegmentError && error.response?.status === 429) {
              // This is a simplified approach; adjust logic based on actual rate limit policy details
              const retryAfter = error.response.headers['Retry-After'] as string; // Retry after the interval if no remaining calls

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
