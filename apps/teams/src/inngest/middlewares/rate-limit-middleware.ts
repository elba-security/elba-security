import { InngestMiddleware, RetryAfterError } from 'inngest';
import { MicrosoftError } from '@/connectors/microsoft/commons/error';

// 15 minutes in seconds
const MIN_RETRY_AFTER = 15 * 60;

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
            const rawRetryAfter =
              error instanceof MicrosoftError && error.response?.headers.get('Retry-After');

            if (!rawRetryAfter) {
              return;
            }

            const retryAfter = Math.max(MIN_RETRY_AFTER, Number(rawRetryAfter));

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `Teams rate limit reached by '${fn.name}' - returned value: ${rawRetryAfter}s - applied value: ${retryAfter}s`,
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
