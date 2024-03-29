import { InngestMiddleware, RetryAfterError } from 'inngest';
import { HarvestError } from '@/connectors/commons/error';

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

            if (error instanceof HarvestError && error.response?.headers['Retry-After']) {
              const retryAfter = new Date(Number(error.response.headers['Retry-After']) * 1000);

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Harvest rate limit reached by '${fn.name}'`,
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
