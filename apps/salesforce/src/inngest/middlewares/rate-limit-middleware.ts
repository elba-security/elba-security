import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SalesforceError } from '@/connectors/common/error';

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

            if (!(error instanceof SalesforceError)) {
              return;
            }

            // This error typically depends on the organization's configuration limits in Salesforce.
            // If this error occurs, We should request the specific organization to increase their API limit.
            // For more information, refer to the related discussion: https://help.salesforce.com/s/articleView?id=000389363&type=1

            if (error.response?.status === 429) {
              const retryAfter = error.response.headers.get('retry-after') || 60;
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
