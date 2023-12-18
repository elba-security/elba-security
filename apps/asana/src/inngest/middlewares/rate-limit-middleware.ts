import { InngestMiddleware, RetryAfterError } from 'inngest';
import { AsanaError } from '@/connectors/commons/error';

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
              error instanceof AsanaError &&
              error.response?.status === 429 &&
              error.response.headers.get('Retry-After');

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `Asana rate limit reached by '${fn.name}'`,
                  Number(retryAfter) * 1000,
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
