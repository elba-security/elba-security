import { InngestMiddleware, RetryAfterError } from 'inngest';
import { ConfluenceError } from '@/connectors/confluence/common/error';

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
              error instanceof ConfluenceError && error.response?.headers.get('Retry-After');

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `Confluence rate limit reached by '${fn.name}'`,
                  `${retryAfter}s`,
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
