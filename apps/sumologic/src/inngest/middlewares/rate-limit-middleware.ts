import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SumologicError } from '@/connectors/commons/error';

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
            if (error instanceof SumologicError && error.response?.status === 429) {
              const retryAfter = 60; // Default retry after 60 seconds

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
