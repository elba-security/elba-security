import { InngestMiddleware, RetryAfterError } from 'inngest';
import { WebflowError } from '@/connectors/commons/error';

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
              error instanceof WebflowError &&
              error.response?.headers['X-RateLimit-Remaining'] === '0'
            ) {
              const retryAfter = new Date();
              retryAfter.setMinutes(retryAfter.getMinutes() + 1);

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Webflow rate limit reached by '${fn.name}'`,
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
