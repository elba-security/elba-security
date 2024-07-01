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

            if (error instanceof LivestormError && error.response?.headers.get('Retry-After')) {
              const retryAfter = error.response.headers.get('Retry-After') || 60;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Livestorm rate limit reached by '${fn.name}'`,
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
