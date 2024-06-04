import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { subMinutes } from 'date-fns';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getRefreshToken } from '@/connectors/dropbox/auth';

export const refreshToken = inngest.createFunction(
  {
    id: 'dropbox-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: `dropbox/app.installed`,
        match: 'data.organisationId',
      },
      {
        event: `dropbox/app.uninstalled`,
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'dropbox/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const nextExpiresAt = await step.run('get-refresh-token', async () => {
      const {
        refreshToken: newRefreshToken,
        accessToken: newAccessToken,
        expiresIn,
      } = await getRefreshToken(organisation.refreshToken);

      const encryptedNewAccessToken = await encrypt(newAccessToken);
      const encryptedNewRefreshToken = await encrypt(newRefreshToken);

      await db
        .update(organisationsTable)
        .set({
          accessToken: encryptedNewAccessToken,
          refreshToken: encryptedNewRefreshToken,
        })
        .where(eq(organisationsTable.id, organisationId));

      return expiresIn;
    });

    await step.sendEvent('next-refresh', {
      name: 'dropbox/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });

    return {
      status: 'completed',
    };
  }
);