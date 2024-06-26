import { InngestMiddleware, RetryAfterError } from 'inngest';
import { OpenAiError } from '@/connectors/common/error';

export const rateLimitMiddleware = new InngestMiddleware({
  name: 'openai-rate-limit',
  init: () => {
    return {
      onFunctionRun: ({ fn }) => {
        return {
          transformOutput: (ctx) => {
            const {
              result: { error, ...result },
              ...context
            } = ctx;

            if (error instanceof OpenAiError && error.response?.status === 429) {
              // Documentation does not give details for this endpoint, 2 minutes fallback if the header is not present
              const retryAfter = error.response.headers.get('Retry-After') || 120;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `OpenAI rate limit reached by '${fn.name}'`,
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
