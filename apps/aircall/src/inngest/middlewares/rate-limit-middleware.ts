import { InngestMiddleware, RetryAfterError } from 'inngest';
import { AircallError } from '@/connectors/common/error';

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

            if (!(error instanceof AircallError)) {
              return;
            }

            const resetHeader = error.response?.headers.get('x-aircallapi-reset'); // it is timestamp in milliseconds

            let retryAfter: string | number | Date = 60;

            if (resetHeader) {
              const resetAt = parseInt(resetHeader, 10);
              const now = Date.now();

              const waitFor = resetAt - now;
              retryAfter = Math.ceil(waitFor / 1000);

              if (retryAfter < 0) {
                retryAfter = 60; // Default to 60 seconds
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Aircall API rate limit reached by '${fn.name}'`,
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
