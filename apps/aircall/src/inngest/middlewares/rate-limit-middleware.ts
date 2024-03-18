import { InngestMiddleware, RetryAfterError } from 'inngest';
import { AircallError } from '@/connectors/commons/error'; // Assuming AircallError is the error class for Aircall API

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

            if (!(error instanceof AircallError)) {
              return;
            }

            const rateLimitReset = error.response?.headers.get('X-AircallApi-Reset');
            let retryAfter: string | number | Date = 60;

            if (rateLimitReset) {
              const resetTime = new Date(parseInt(rateLimitReset, 10) * 1000); // Assuming X-AircallApi-Reset is in seconds
              const currentTime = new Date();
              retryAfter = (resetTime.getTime() - currentTime.getTime()) / 1000; // Calculate delay in seconds

              if (retryAfter < 0) {
                // If the calculated delay is negative, default to a safe short delay to ensure we don't hammer the API
                retryAfter = 60; // Default to 60 seconds
              }
            }

            return {
              ...context,
              result: {
                ...result,
                error: new RetryAfterError(
                  `Aircall API rate limit reached by '${fn.name}'`,
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
