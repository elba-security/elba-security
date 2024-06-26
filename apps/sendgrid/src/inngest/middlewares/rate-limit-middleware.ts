import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SendgridError } from '@/connectors/commons/error';

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

            if (!(error instanceof SendgridError)) {
              return;
            }

            if (error.response?.status === 429) {
              const resetTimestamp = error.response.headers.get('x-ratelimit-reset'); // in seconds, Request can be made after this time
              const currentTime = Math.floor(Date.now() / 1000);
              const retryAfter = resetTimestamp ? parseInt(resetTimestamp, 10) - currentTime : 60;

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
