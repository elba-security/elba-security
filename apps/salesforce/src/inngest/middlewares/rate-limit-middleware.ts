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
            // TODO: remove this once discussed with Guillaume & Alex
            // if (error.response?.status === 403) {
            //   const data = await error.response.text();
            //   const errors = JSON.parse(data) as {
            //     errorCode: string;
            //     message: string;
            //   }[];

            //   if (errors.length > 0) {
            //     if (errors[0]?.errorCode === 'REQUEST_LIMIT_EXCEEDED') {
            //       return new NonRetriableError(errors[0].message);
            //     }
            //   }
            // }

            // TODO: remove this once discussed with Guillaume & Alex
            // Sales force doesn't support  rate limit 429
            // https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_methods_system_restresponse.htm?search_text=HTTP%20Response
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
