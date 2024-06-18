import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/microsoft/auth';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';
import { getOrganisation } from '@/inngest/common/organisations';

export const refreshToken = inngest.createFunction(
  {
    id: 'microsoft-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'microsoft/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'microsoft/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'microsoft/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 30));

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const organisation = await getOrganisation(organisationId);

      const { token, expiresIn } = await getToken(organisation.tenantId);

      const encodedToken = await encrypt(token);

      await db
        .update(organisationsTable)
        .set({ token: encodedToken })
        .where(eq(organisationsTable.id, organisationId));

      return addSeconds(new Date(), expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'microsoft/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
