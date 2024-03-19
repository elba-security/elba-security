import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt, encrypt } from '@/common/crypto';
import { getRefreshedToken } from '@/connectors/x-saas/auth';

export const refreshToken = inngest.createFunction(
  {
    id: 'x-saas-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'x-saas/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'x-saas/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'x-saas/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 5));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const [organisation] = await db
        .select()
        .from(organisationsTable)
        .where(and(eq(organisationsTable.id, organisationId)));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const result = await getRefreshedToken(await decrypt(organisation.refreshToken));

      const encodedAccessToken = await encrypt(result.accessToken);
      const encodedRefreshToken = await encrypt(result.refreshToken);

      await db
        .update(organisationsTable)
        .set({ accessToken: encodedAccessToken, refreshToken: encodedRefreshToken })
        .where(eq(organisationsTable.id, organisationId));

      return addSeconds(new Date(), result.expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'x-saas/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
