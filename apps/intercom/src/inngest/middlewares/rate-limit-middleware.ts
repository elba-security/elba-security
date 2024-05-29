import { InngestMiddleware, RetryAfterError } from 'inngest';
import { IntercomError } from '@/connectors/common/error';

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

            if (!(error instanceof IntercomError) || !error.response) {
              return;
            }

            // DOC: https://developers.intercom.com/docs/references/rest-api/errors/rate-limiting/
            if (error.response.status === 429) {
              let resetAfter = 60;
              const rateLimitRemaining = error.response.headers.get('X-RateLimit-Remaining');
              const rateLimitReset = error.response.headers.get('X-RateLimit-Reset');

              if (
                Boolean(rateLimitRemaining) &&
                Boolean(rateLimitReset) &&
                Number(rateLimitRemaining) < 2
              ) {
                resetAfter = Number(rateLimitReset) - Math.floor(Date.now() / 1000);
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Intercom rate limit reached by '${fn.name}'`,
                    `${resetAfter}s`,
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
