import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getRefreshToken } from '@/connectors/box/auth';
import { env } from '@/common/env';
import { encrypt, decrypt } from '@/common/crypto';

export const refreshToken = inngest.createFunction(
  {
    id: 'box-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'box/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'box/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'box/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 15));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          refreshToken: organisationsTable.refreshToken,
        })
        .from(organisationsTable)
        .where(and(eq(organisationsTable.id, organisationId)));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      const refreshTokenInfo = await decrypt(organisation.refreshToken);

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = await getRefreshToken(refreshTokenInfo);

      const encryptedNewAccessToken = await encrypt(newAccessToken);
      const encryptedNewRefreshToken = await encrypt(newRefreshToken);
      await db
        .update(organisationsTable)
        .set({
          accessToken: encryptedNewAccessToken,
          refreshToken: encryptedNewRefreshToken,
        })
        .where(eq(organisationsTable.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'box/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
