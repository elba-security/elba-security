import { InngestMiddleware, RetryAfterError } from 'inngest';
import { OutreachError } from '@/connectors/common/error';

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

            if (!(error instanceof OutreachError)) {
              return;
            }

            if (error.response?.status === 429) {
              let retryAfter = 60;
              const retryAfterHeader = error.response.headers.get('X-RateLimit-Reset');
              if (retryAfterHeader) {
                retryAfter = parseInt(retryAfterHeader, 10);
              }
              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Rate limit exceeded for '${fn.name}'. Retry after ${retryAfter} seconds.`,
                    `${retryAfter}s`,
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
