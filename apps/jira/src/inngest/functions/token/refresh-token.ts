import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { addSeconds, subMinutes } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { refreshAccessToken } from '@/connectors/jira/auth';

export const handleRefreshToken = inngest.createFunction(
  {
    id: 'jira-refresh-token',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'jira/jira.elba_app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'jira/jira.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.TOKEN_REFRESH_MAX_RETRY,
  },
  { event: 'jira/token.refresh.triggered' },
  async ({ event, step }) => {
    const { organisationId } = event.data;

    const [organisation] = await db
      .select({
        refreshToken: organisationsTable.refreshToken,
      })
      .from(organisationsTable)
      .where(and(eq(organisationsTable.id, organisationId)));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { accessToken, refreshToken, expiresIn } = await refreshAccessToken(
      organisation.refreshToken
    );

    await db
      .update(organisationsTable)
      .set({ accessToken, refreshToken })
      .where(eq(organisationsTable.id, organisationId));

    await step.sendEvent('schedule-token-refresh', {
      name: 'jira/token.refresh.triggered',
      data: {
        organisationId,
      },
      // we schedule a token refresh 5 minutes before it expires
      ts: subMinutes(addSeconds(new Date(), expiresIn), 5).getTime(),
    });
  }
);
