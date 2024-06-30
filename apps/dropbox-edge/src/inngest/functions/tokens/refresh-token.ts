import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { addSeconds, subMinutes } from 'date-fns';
import { failureRetry } from '@elba-security/inngest';
import { inngest } from '@/inngest/client';
import { decrypt, encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getRefreshToken } from '@/connectors/dropbox/auth';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';

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
    onFailure: failureRetry(),
    middleware: [unauthorizedMiddleware],
    retries: 5,
  },
  { event: 'dropbox/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));
    const [organisation] = await db
      .select({
        refreshToken: organisationsTable.refreshToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const nextExpiresIn = await step.run('get-refresh-token', async () => {
      const decryptedAccessToken = await decrypt(organisation.refreshToken);

      const { accessToken: newAccessToken, expiresIn } =
        await getRefreshToken(decryptedAccessToken);

      const encryptedAccessToken = await encrypt(newAccessToken);

      await db
        .update(organisationsTable)
        .set({
          accessToken: encryptedAccessToken,
        })
        .where(eq(organisationsTable.id, organisationId));

      return expiresIn;
    });

    await step.sendEvent('next-refresh', {
      name: 'dropbox/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: addSeconds(new Date(), nextExpiresIn).getTime(),
      },
    });
  }
);
