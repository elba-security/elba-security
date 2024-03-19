import { InngestMiddleware, RetryAfterError } from 'inngest';
import { IntercomError } from '@/connectors/commons/error';

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
            const retryAfter =
              error instanceof IntercomError && error.response?.headers.get('X-RateLimit-Reset');

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `Intercom rate limit reached by '${fn.name}'`,
                  new Date(Number(retryAfter) * 1000),
                  {
                    cause: error,
                  }
                ),
              },
            };
          },
        };
      },
    };
  },
});
