import { InngestMiddleware, RetryAfterError } from 'inngest';
import { ApolloError } from '@/connectors/commons/error';

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

            if (
              error instanceof ApolloError &&
              error.response?.headers['x-minute-requests-left'] === '0'
            ) {
              const retryAfter = new Date();
              retryAfter.setMinutes(retryAfter.getMinutes() + 1);

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Heroku rate limit reached by '${fn.name}'`,
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
