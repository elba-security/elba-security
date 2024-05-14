import { InngestMiddleware, RetryAfterError } from 'inngest';
import { MondayError } from '@/connectors/common/error';

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

            if (error instanceof MondayError && error.response?.status === 429) {
              // Still we  are not confirm whether MondayError has headers property or not, so we are using optional chaining operator
              const retryAfter = error.response.headers.get('retry-after') || 60;
              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Monday rate limit reached by '${fn.name}'`,
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
