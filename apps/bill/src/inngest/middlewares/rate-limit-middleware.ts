import { InngestMiddleware, RetryAfterError } from 'inngest';
import { BillError } from '@/connectors/common/error';

export const rateLimitMiddleware = new InngestMiddleware({
  name: 'rate-limit',
  init: () => {
    return {
      onFunctionRun: ({ fn }) => {
        return {
          transformOutput: async (ctx) => {
            const {
              result: { error, ...result },
              ...context
            } = ctx;

            if (!(error instanceof BillError)) {
              return;
            }

            if (error.response?.status === 422) {
              let retryAfter = 60;
              const body = (await error.response.json()) as unknown; // safer than 'any'

              if (Array.isArray(body)) {
                const first = body[0] as { code?: string };
                const code = first.code;

                if (code === 'BDC_1144') {
                  retryAfter = 3600; // Hourly limit
                } else if (code === 'BDC_1322') {
                  retryAfter = 10; // Concurrency limit
                }
              }

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
