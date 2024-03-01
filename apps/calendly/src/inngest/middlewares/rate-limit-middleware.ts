import { InngestMiddleware, RetryAfterError } from 'inngest';
import { MySaasError } from '@/connectors/commons/error';

/**
 * This middleware, `rateLimitMiddleware`, is designed for use with the Inngest serverless framework.
 * It aims to handle rate limiting scenarios encountered when interacting with external SaaS APIs.
 * The middleware checks for specific errors (instances of MySaaSError) that indicate a rate limit has been reached,
 * and it responds by creating a RetryAfterError. This error includes the retry time based on the 'Retry-After' header
 * provided by the SaaS service, enabling the function to delay its next execution attempt accordingly.
 *
 * Key Features:
 * - Intercepts function output to check for rate limit errors.
 * - Handles MySaaSError, specifically looking for a 'Retry-After' header in the error response.
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
            const retryAfter =
              error instanceof MySaasError && error.response?.headers.get('Retry-After');

            if (!retryAfter) {
              return;
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `MySaaS rate limit reached by '${fn.name}'`,
                  retryAfter,
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
