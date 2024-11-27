import { InngestMiddleware, NonRetriableError, RetryAfterError } from 'inngest';
import { addDays, differenceInSeconds, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { logger } from '@elba-security/logger';
import { HubspotError } from '@/connectors/common/error';
import { nangoAPIClient } from '@/common/nango/api';
import { getAccountInfo } from '@/connectors/hubspot/users';

const secondsUntilMidnight = (timezone: string): number => {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const midnight = startOfDay(addDays(zonedNow, 1));
  return differenceInSeconds(midnight, zonedNow);
};

const getTimeZone = async (organisationId: string) => {
  const { credentials } = await nangoAPIClient.getConnection(organisationId);
  if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
    throw new NonRetriableError(
      `Nango credentials are missing or invalid for the organisation with id=${organisationId}`
    );
  }
  const { timeZone } = await getAccountInfo(credentials.access_token);

  return timeZone;
};

// Example thread https://community.hubspot.com/t5/APIs-Integrations/Batch-Deals-Update-API-Limit/m-p/678230
export const rateLimitMiddleware = new InngestMiddleware({
  name: 'rate-limit',
  init: () => {
    return {
      onFunctionRun: ({ fn }) => {
        return {
          transformOutput: async (ctx) => {
            const {
              result: { error, ...result },
              ...context
            } = ctx;

            if (!(error instanceof HubspotError)) {
              return;
            }

            if (error.response?.status === 429) {
              let retryAfter = 60;
              const rateLimitRemaining = parseInt(
                error.response.headers.get('X-HubSpot-RateLimit-Remaining') || '0',
                10
              );
              const rateLimitInterval = parseInt(
                error.response.headers.get('X-HubSpot-RateLimit-Interval-Milliseconds') || '10000',
                10
              );
              const rateLimitDailyRemaining = parseInt(
                error.response.headers.get('X-HubSpot-RateLimit-Daily-Remaining') || '0',
                10
              );

              logger.info('Rate limit exceeded', {
                'X-HubSpot-RateLimit-Remaining': rateLimitRemaining,
                'X-HubSpot-RateLimit-Interval-Milliseconds': rateLimitInterval,
                'X-HubSpot-RateLimit-Daily-Remaining': rateLimitDailyRemaining,
              });

              const timezone = await getTimeZone(
                (
                  result as {
                    data: { organisationId: string };
                  }
                ).data.organisationId
              );

              if (rateLimitRemaining <= 0) {
                retryAfter = Number(rateLimitInterval) / 1000;
              }

              if (rateLimitDailyRemaining <= 0) {
                retryAfter = secondsUntilMidnight(timezone);
              }

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
