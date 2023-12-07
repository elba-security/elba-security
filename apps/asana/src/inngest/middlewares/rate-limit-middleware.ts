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
            // TODO: extract retryAfter from the error
            // error instanceof AsanaError && error.response.headers['retry-after'] ....
            const retryAfter = false;

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `MySaaS rate limit reached by '${fn.name}'`,
                  retryAfter,
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
