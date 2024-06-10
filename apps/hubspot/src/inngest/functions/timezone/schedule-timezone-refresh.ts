import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';

export const scheduleTimeZoneRefresh = inngest.createFunction(
  { id: 'schedule-timezone-refresh' },
  { cron: env.HUBSPOT_TIMEZONE_REFRESH_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
        region: organisationsTable.region,
      })
      .from(organisationsTable);
    if (organisations.length > 0) {
      await step.sendEvent(
        'refresh-timezone',
        organisations.map(({ id, region }) => ({
          name: 'hubspot/timezone.refresh.requested',
          data: {
            organisationId: id,
            region,
          },
        }))
      );
    }

    return { organisations };
  }
);
