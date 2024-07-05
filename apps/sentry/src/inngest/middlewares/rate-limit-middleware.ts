import { InngestMiddleware, RetryAfterError } from 'inngest';
import { z } from 'zod';
import { SentryError } from '@/connectors/common/error';

const sentryRateLimitError = z.object({
  errors: z.array(
    z.object({
      extensions: z.object({
        code: z.literal('RATELIMITED'),
      }),
    })
  ),
});

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

            if (!(error instanceof SentryError) || !error.response) {
              return;
            }

            try {
              const response: unknown = await error.response.clone().json();
              const isRateLimitError = sentryRateLimitError.safeParse(response).success;
              if (!isRateLimitError) {
                return;
              }
            } catch (_error) {
              return;
            }

            const rateLimitReset = error.response.headers.get('x-sentry-rate-limit-reset');

            const nowInSeconds = Math.floor(Date.now() / 1000);
            const retryAfter = rateLimitReset ? parseInt(rateLimitReset) - nowInSeconds : 60;

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `API rate limit reached by '${fn.name}', retry after ${retryAfter} seconds.`,
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
