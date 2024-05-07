import { InngestMiddleware, RetryAfterError } from 'inngest';
import { LinearError } from '@/connectors/common/error';

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

            if (!(error instanceof LinearError)) {
              return;
            }

            if (error.response?.status === 429) {
              // We are not sure of  retry-after header value, so we set it to 60 seconds
              // https://developers.linear.app/docs/graphql/working-with-the-graphql-api/rate-limiting
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
            }
          },
        };
      },
    };
  },
});
