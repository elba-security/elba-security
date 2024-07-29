import { InngestMiddleware, RetryAfterError } from 'inngest';

export type RateLimitMiddlewareOptions = {
  getRetryAfter: (error: unknown) => undefined | null | string | number | Date;
};

export const rateLimitMiddleware = ({ getRetryAfter }: RateLimitMiddlewareOptions) =>
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

              const retryAfter = getRetryAfter(error);

              if (retryAfter) {
                return {
                  ...context,
                  result: {
                    ...result,
                    error: new RetryAfterError(
                      `${client.id} rate limit reached by '${fn.name}'`,
                      retryAfter,
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
