import { subMinutes } from 'date-fns/subMinutes';
import { addSeconds } from 'date-fns/addSeconds';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { refreshAccessToken } from '@/connectors/auth';

export const refreshToken = inngest.createFunction(
  {
    id: 'heroku-refresh-token',
    cancelOn: [
      {
        event: 'heroku/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'heroku/app.installed',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'heroku/token.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId, expiresAt } = event.data;

    await step.sleepUntil('wait-before-expiration', subMinutes(new Date(expiresAt), 5));

    const organisation = await step.run('get-organisation', async () => {
      const [row] = await db
        .select()
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!row) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return row;
    });

    const nextExpiresAt = await step.run('refresh-token', async () => {
      const result = await refreshAccessToken(organisation.refreshToken);

      await db
        .update(organisationsTable)
        .set({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        })
        .where(eq(organisationsTable.id, organisationId));

      return addSeconds(new Date(), result.expiresIn);
    });

    await step.sendEvent('next-refresh', {
      name: 'heroku/token.refresh.requested',
      data: {
        organisationId,
        expiresAt: new Date(nextExpiresAt).getTime(),
      },
    });
  }
);
