import { env } from '@/common/env';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
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
          name: 'onedrive/token.refresh.requested',
          data: { organisationId },
        }))
      );
    }

    return { organisations };
  }
);
