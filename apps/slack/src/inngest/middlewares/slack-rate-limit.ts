import { InngestMiddleware, RetryAfterError } from 'inngest';
import { SlackAPIError } from 'slack-web-api-client';

export const slackRateLimitMiddleware = new InngestMiddleware({
  name: 'slack-rate-limit',
  init: () => {
    return {
      onFunctionRun: ({ fn }) => {
        return {
          transformOutput: (ctx) => {
            const {
              result: { error, ...result },
              ...context
            } = ctx;
            if (error instanceof SlackAPIError && error.error === 'ratelimited') {
              const retryAfterHeader = error.result.headers.get('Retry-After');
              let retryAfterInSeconds = 60;
              if (retryAfterHeader) {
                retryAfterInSeconds = parseInt(retryAfterHeader);
              }

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Slack rate limit hit by '${fn.name}'`,
                    retryAfterInSeconds * 1000,
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
