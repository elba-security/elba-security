import { InngestMiddleware, RetryAfterError } from 'inngest';
import { z } from 'zod';
import { AsanaError } from '@/connectors/common/error';

const asanaRateLimitError = z.object({
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

            if (!(error instanceof AsanaError) || !error.response) {
              return;
            }

            try {
              const response: unknown = await error.response.clone().json();
              const isRateLimitError = asanaRateLimitError.safeParse(response).success;
              if (!isRateLimitError) {
                return;
              }
            } catch (_error) {
              return;
            }

            // We are not sure of  retry-after header value, so we set it to 60 seconds
            // https://developers.asana.app/docs/graphql/working-with-the-graphql-api/rate-limiting
            const retryAfter = error.response.headers.get('Retry-After') || 60;

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
