import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import type { JiraUser } from '@/connectors/jira/users';
import { getUsers } from '@/connectors/jira/users';

const formatJiraUser = (user: JiraUser): User => ({
  id: user.accountId,
  email: user.emailAddress,
  displayName: user.displayName,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'jira-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'jira/jira.elba_app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: env.USERS_SYNC_MAX_RETRY,
  },
  { event: 'jira/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, startAt, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        cloudId: organisationsTable.cloudId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region: organisation.region,
    });

    const startAtNext = await step.run('paginate', async () => {
      const result = await getUsers({
        accessToken: organisation.accessToken,
        cloudId: organisation.cloudId,
        startAt: startAt ?? 0,
      });

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          cloudId: organisation.cloudId,
          invalidUsers: result.invalidUsers,
        });
      }

      await elba.users.update({
        users: result.validUsers.map(formatJiraUser),
      });

      return result.startAtNext;
    });

    if (startAtNext !== null) {
      await step.sendEvent('sync-next-users-page', {
        name: 'jira/users.sync.requested',
        data: {
          ...event.data,
          startAt: startAtNext,
        },
      });

      return { status: 'ongoing' };
    }

    await elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });

    return {
      status: 'completed',
    };
  }
);
