import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

/**
 * DISCLAIMER:
 * This function, `synchronizeUsers`, is provided as an illustrative example and is not a working implementation.
 * It is intended to demonstrate a conceptual approach for syncing users in a SaaS integration context.
 * Developers should note that each SaaS integration may require a unique implementation, tailored to its specific requirements and API interactions.
 * This example should not be used as-is in production environments and should not be taken for granted as a one-size-fits-all solution.
 * It's essential to adapt and modify this logic to fit the specific needs and constraints of the SaaS platform you are integrating with.
 */
export const scheduleTimeZoneRefresh = inngest.createFunction(
  { id: 'schedule-timezone-refresh'},
  { cron: env.TIMEZONE_REFRESH_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: Organisation.id,
        region: Organisation.region,
      })
      .from(Organisation)
      if (organisations.length > 0) {
        await step.sendEvent(
          'refresh-timezone',
          organisations.map(({ id, region }) => ({
            name: 'hubspot/timezone.refresh.requested',
            data: {
              organisationId: id,
              region
            },
          }))
        );
      }

      return { organisations };
  }
);
