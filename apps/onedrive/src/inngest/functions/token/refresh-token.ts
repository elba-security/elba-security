import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { failureRetry } from '@elba-security/inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { encrypt } from '@/common/crypto';
import { getToken } from '@/connectors/microsoft/auth/tokens';
import { unauthorizedMiddleware } from '@/inngest/middlewares/unauthorized-middleware';

export const refreshToken = inngest.createFunction(
  {
    id: 'onedrive-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    onFailure: failureRetry(),
    middleware: [unauthorizedMiddleware],
    cancelOn: [
      {
        event: 'onedrive/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'onedrive/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'onedrive/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 15));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select({
          tenantId: organisationsTable.tenantId,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const { token, expiresIn } = await getToken(organisation.tenantId);

      const encryptedToken = await encrypt(token);

      await db
        .update(organisationsTable)
        .set({ token: encryptedToken })
        .where(eq(organisationsTable.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'onedrive/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
