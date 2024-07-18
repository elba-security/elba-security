import { InngestMiddleware, RetryAfterError } from 'inngest';
import { DocusignError } from '@/connectors/common/error';

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

            if (!(error instanceof DocusignError) || !error.response) {
              return;
            }

            if (error.response.status === 429) {
              let resetAfter = 60;
              const rateLimitReset = error.response.headers.get('x-rateLimit-reset');

              if (rateLimitReset) {
                resetAfter = Number(rateLimitReset) - Math.floor(Date.now() / 1000);
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Docusign rate limit reached by '${fn.name}'`,
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
