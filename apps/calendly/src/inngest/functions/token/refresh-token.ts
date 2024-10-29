import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { failureRetry } from '@elba-security/inngest';
import { db, tables } from '@/database/client';
import { inngest } from '@/inngest/client';
import { getRefreshToken } from '@/connectors/calendly/auth';
import { encrypt, decrypt } from '@/common/crypto';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';

export const refreshToken = inngest.createFunction(
  {
    id: 'calendly-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'calendly/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'calendly/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    onFailure: failureRetry(),
    middleware: [unauthorizedMiddleware],
    retries: 5,
  },
  { event: 'calendly/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          refreshToken: tables.organisationsTable.refreshToken,
        })
        .from(tables.organisationsTable)
        .where(eq(tables.organisationsTable.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const refreshTokenInfo = await decrypt(organisation.refreshToken);

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      } = await getRefreshToken(refreshTokenInfo);

      const encryptedAccessToken = await encrypt(newAccessToken);
      const encryptedRefreshToken = await encrypt(newRefreshToken);

      await db
        .update(tables.organisationsTable)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
        })
        .where(eq(tables.organisationsTable.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'calendly/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
