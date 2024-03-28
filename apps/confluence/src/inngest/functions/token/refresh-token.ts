import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getRefreshedToken } from '@/connectors/confluence/auth';
import { env } from '@/common/env';
import { decrypt, encrypt } from '@/common/crypto';
import { getOrganisation } from '@/inngest/common/organisations';

export const refreshToken = inngest.createFunction(
  {
    id: 'confluence-refresh-token',
    cancelOn: [
      {
        event: 'confluence/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'confluence/app.installed',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'confluence/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 5));

    const organisation = await step.run('get-organisation', () => getOrganisation(organisationId));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const result = await getRefreshedToken(await decrypt(organisation.refreshToken));

      const encodedAccessToken = await encrypt(result.accessToken);
      const encodedRefreshedToken = await encrypt(result.refreshToken);

      await db
        .update(organisationsTable)
        .set({
          accessToken: encodedAccessToken,
          refreshToken: encodedRefreshedToken,
        })
        .where(eq(organisationsTable.id, organisationId));

      return addSeconds(new Date(), result.expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'confluence/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
