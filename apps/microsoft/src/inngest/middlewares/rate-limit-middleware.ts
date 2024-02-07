import { InngestMiddleware, RetryAfterError } from 'inngest';
import { MicrosoftError } from '@/connectors/microsoft/commons/error';

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
              error instanceof MicrosoftError && error.response?.headers.get('Retry-After');

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `Microsoft rate limit reached by '${fn.name}'`,
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
