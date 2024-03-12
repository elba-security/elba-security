import { addSeconds } from 'date-fns/addSeconds';
import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { subMinutes } from 'date-fns/subMinutes';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/microsoft/auth/auth';
import { env } from '@/env';
import { encrypt } from '@/common/crypto';

export const refreshToken = inngest.createFunction(
  {
    id: 'teams-refresh-token',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'teams/teams.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'teams/token.refresh.triggered' },
  async ({ event, step }) => {
    const { organisationId, expiresIn } = event.data;

    await step.sleepUntil('wait', subMinutes(addSeconds(new Date(), expiresIn), 5));

    const [organisation] = await db
      .select({
        tenantId: organisationsTable.tenantId,
      })
      .from(organisationsTable)
      .where(and(eq(organisationsTable.id, organisationId)));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { token } = await getToken(organisation.tenantId);

    const encodedToken = await encrypt(token);

    await db
      .update(organisationsTable)
      .set({ token: encodedToken })
      .where(eq(organisationsTable.id, organisationId));

    await step.sendEvent('schedule-token-refresh', {
      name: 'teams/token.refresh.triggered',
      data: {
        organisationId,
        expiresIn,
      },
    });
  }
);
