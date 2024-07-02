import { InngestMiddleware, NonRetriableError, RetryAfterError } from 'inngest';
import { addDays, differenceInSeconds, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { HubspotError } from '@/connectors/hubspot/common/error';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

const secondsUntilMidnight = (timezone: string): number => {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const midnight = startOfDay(addDays(zonedNow, 1));
  return differenceInSeconds(midnight, zonedNow);
};

const getTimeZone = async (organisationId: string) => {
  const [organisation] = await db
    .select({
      timeZone: organisationsTable.timeZone,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.id, organisationId));

  if (!organisation) {
    throw new NonRetriableError(`Could not retrieve organisation`);
  }

  return organisation.timeZone;
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
