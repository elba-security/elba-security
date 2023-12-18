import { lte } from 'drizzle-orm';
import { env } from '@/env';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '../../client';

export const scheduleTokenRefresh = inngest.createFunction(
  { id: 'schedule-token-refresh' },
  { cron: env.TOKEN_REFRESH_CRON },
  async ({ step }) => {
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60000);

    const organisations = await db
      .select({
        id: Organisation.id,
        refreshToken: Organisation.refreshToken,
      })
      .from(Organisation)
      .where(lte(Organisation.expiresAt, thirtyMinutesFromNow));

    if (organisations.length > 0) {
      await step.sendEvent(
        'refresh-token',
        organisations.map(({ id, refreshToken }) => ({
          name: 'token/refresh',
          data: {
            organisationId: id,
            refreshTokenInfo: refreshToken,
            syncStartedAt: Date.now(),
            isFirstSync: false,
          },
        }))
      );
    }

    return { organisations };
  }
);
