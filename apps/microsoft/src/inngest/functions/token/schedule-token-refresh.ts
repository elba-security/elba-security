import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

export const scheduleTokenRefresh = inngest.createFunction(
  { id: 'onedrive-schedule-token-refresh' },
  { cron: env.TOKEN_REFRESH_CRON },
  async ({ step }) => {
    const organisations = await db
      .select({
        id: organisationsTable.id,
      })
      .from(organisationsTable);

    if (organisations.length > 0) {
      await step.sendEvent(
        'refresh-organisations-tokens',
        organisations.map(({ id: organisationId }) => ({
          name: 'microsoft/token.refresh.requested',
          data: { organisationId },
        }))
      );
    }

    return { organisations };
  }
);
