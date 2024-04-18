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
              error.response?.headers['RateLimit-Remaining'] === '0' &&
              error.response.headers['Retry-After']
            ) {
              const retryAfter = Number(error.response.headers['Retry-After']);

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Livestorm rate limit reached by '${fn.name}'`,
                    retryAfter * 1000,
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
