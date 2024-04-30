import { InngestMiddleware, RetryAfterError } from 'inngest';
import { LivestormError } from '@/connectors/common/error';

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

            if (!(error instanceof LivestormError)) {
              return;
            }

            if (error.response?.status === 429) {
              const retryAfter = error.response.headers.get('retry-after') || 60;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Livestorm rate limit reached by '${fn.name}'`,
                    `${retryAfter}s`,
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
