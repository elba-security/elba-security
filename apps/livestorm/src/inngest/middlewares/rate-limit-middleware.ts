import { InngestMiddleware, RetryAfterError } from 'inngest';
import { LivestormError } from '@/connectors/commons/error';

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

            if (
              error instanceof LivestormError &&
              error.response?.headers['RateLimit-Monthly-Remaining'] === '0' &&
              error.response.headers['RateLimit-Reset']
            ) {
              const retryAfter = new Date(Number(error.response.headers['RateLimit-Reset']) * 1000);

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Livestorm rate limit reached by '${fn.name}'`,
                    retryAfter,
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
