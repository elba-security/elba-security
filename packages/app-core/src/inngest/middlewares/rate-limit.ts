import { InngestMiddleware, RetryAfterError } from 'inngest';

export type RateLimitMiddlewareOptions = {
  /**
   * @returns The time after which the function should be retried. Represents either a
   * number of seconds or a RFC3339 date.
   */
  getErrorRetryAfter: (error: unknown) => number | string | Date | null | undefined;
};

export const rateLimitMiddleware = ({ getErrorRetryAfter }: RateLimitMiddlewareOptions) =>
  new InngestMiddleware({
    name: 'rate-limit',
    init: ({ client }) => {
      return {
        onFunctionRun: ({ fn }) => {
          return {
            transformOutput: (ctx) => {
              const {
                result: { error, ...result },
                ...context
              } = ctx;
              const retryAfter = getErrorRetryAfter(error);

              if (!retryAfter) {
                return;
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `${client.id} rate limit reached by '${fn.name}'`,
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
