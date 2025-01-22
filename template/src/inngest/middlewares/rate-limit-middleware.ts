import { InngestMiddleware, RetryAfterError } from 'inngest';
import { ServiceError } from '@/connectors/common/error';

/**
 * This middleware handles rate limiting scenarios encountered when interacting with external SaaS APIs.
 * It intercepts errors from your API calls and converts rate limit responses into RetryAfterError instances,
 * which Inngest uses to properly schedule retries.
 *
 * The middleware specifically:
 * 1. Checks for ServiceError instances (extend this class for your API-specific errors)
 * 2. Looks for 429 (Too Many Requests) status codes
 * 3. Uses the 'Retry-After' header to determine the delay, defaulting to 60 seconds
 *
 * To use with your specific API:
 * 1. Ensure your API errors extend ServiceError
 * 2. Verify your API returns proper 429 status codes
 * 3. Check if your API uses a different rate limit response format
 *
 * Example customization:
 * ```typescript
 * if (error instanceof ServiceError) {
 *   // Add custom rate limit detection logic
 *   if (error.response?.headers.get('x-rate-limit-remaining') === '0') {
 *     const retryAfter = error.response.headers.get('x-rate-limit-reset') || 60;
 *     // Handle custom rate limit format
 *   }
 * }
 * ```
 */
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

            if (!(error instanceof ServiceError)) {
              return;
            }

            if (error.response?.status === 429) {
              const retryAfter = error.response.headers.get('retry-after') || 60;

              return {
                ...context,
                result: {
                  ...result,
                  error: new RetryAfterError(
                    `Rate limit reached by '${fn.name}'`,
                    `${retryAfter}s`,
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
