import { InngestMiddleware, RetryAfterError } from 'inngest';
import { ElasticError } from '@/connectors/elastic/common/error';

export const rateLimitMiddleware = new InngestMiddleware({
  name: 'elastic-rate-limit',
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
              const interval = error.response.headers.get('x-ratelimit-interval');
              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Rate limit exceeded for '${fn.name}'. Retry after ${interval} seconds.`,
                    `${interval}s`,
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
