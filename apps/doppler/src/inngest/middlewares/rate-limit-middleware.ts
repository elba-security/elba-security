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

            if (error instanceof DopplerError && error.response?.status === 429) {
              const retryAfter = error.response.headers.get('retry-after') || 60;

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
