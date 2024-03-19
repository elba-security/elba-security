import { InngestMiddleware, RetryAfterError } from 'inngest';
import { DocusignError } from '@/connectors/commons/error';

/**
 * This middleware, `rateLimitMiddleware`, is designed for use with the Inngest serverless framework.
 * It aims to handle rate limiting scenarios encountered when interacting with external SaaS APIs.
 * The middleware checks for specific errors (instances of DocusignError) that indicate a rate limit has been reached,
 * and it responds by creating a RetryAfterError. This error includes the retry time based on the 'Retry-After' header
 * provided by the SaaS service, enabling the function to delay its next execution attempt accordingly.
 *
 * Key Features:
 * - Intercepts function output to check for rate limit errors.
 * - Handles DocusignError, specifically looking for a 'Retry-After' header in the error response.
 * - Generates a RetryAfterError to reschedule the function run, preventing immediate retries that could violate the SaaS's rate limits.
 *
 * Note: This is a generic middleware template and might require adjustments to fit specific SaaS APIs' error handling and rate limiting schemes.
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

            if (!(error instanceof DocusignError)) {
              return;
            }

            const rateLimitReset = error.response?.headers.get('X-RateLimit-Reset');
            const rateLimitRemaining = error.response?.headers.get('X-RateLimit-Remaining');
            const burstLimitRemaining = error.response?.headers.get('X-BurstLimit-Remaining');

            let retryAfter: string | number | undefined;

            // Calculate retry delay based on X-RateLimit-Reset if rate or burst limit is exceeded
            if (
              (rateLimitRemaining && parseInt(rateLimitRemaining) <= 10) ||
              (burstLimitRemaining && parseInt(burstLimitRemaining) <= 10)
            ) {
              if (rateLimitReset) {
                const resetTime = new Date(parseInt(rateLimitReset) * 1000);
                const currentTime = new Date();
                retryAfter = Math.max(0, resetTime.getTime() - currentTime.getTime()) / 1000; // convert ms to s
              } else {
                // Default to a safe retry delay (e.g., 1 minute) when specific timing is unavailable
                retryAfter = 60;
              }
            }

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `API rate limit reached by '${fn.name}'`,
                  retryAfter.toString(),
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
