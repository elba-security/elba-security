import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getRefreshToken } from '@/connectors/auth';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';

export const refreshToken = inngest.createFunction(
  {
    id: 'pagerduty-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'pagerduty/pagerduty.elba_app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'pagerduty/pagerduty.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'pagerduty/pagerduty.token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 5));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          refreshToken: Organisation.refreshToken,
        })
        .from(Organisation)
        .where(and(eq(Organisation.id, organisationId)));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = await getRefreshToken(organisation.refreshToken);
      
      const encodedNewAccessToken = await encrypt(newAccessToken);
      const encodedNewRefreshToken = await encrypt(newRefreshToken);
      await db
        .update(Organisation)
        .set({
          accessToken: encodedNewAccessToken,
          refreshToken: encodedNewRefreshToken,
        })
        .where(eq(Organisation.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'pagerduty/pagerduty.token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
