import { InngestMiddleware, RetryAfterError } from 'inngest';
import { YousignError } from '@/connectors/commons/error';

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
            if (error instanceof YousignError && error.response?.status === 429) {
              // Extract the rate limiting information from the headers
              const remainingMinute = error.response.headers.get('X-Ratelimit-Remaining-Minute');
              const remainingHour = error.response.headers.get('X-Ratelimit-Remaining-Hour');

              // Determine the retry delay based on remaining quotas
              // This example uses a simple strategy and may need refinement
              let retryAfter = 60; // Default retry after 60 seconds
              if (remainingMinute && parseInt(remainingMinute) <= 0) {
                retryAfter = 60; // Wait for the next minute window if the minute limit is reached
              } else if (remainingHour && parseInt(remainingHour) <= 0) {
                retryAfter = 3600; // Wait for the next hour window if the hour limit is reached
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(`Rate limit exceeded for '${fn.name}'`, retryAfter, {
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
