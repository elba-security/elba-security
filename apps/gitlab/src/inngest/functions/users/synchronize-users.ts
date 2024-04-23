import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type GitlabUser } from '@/connectors/users';
import { getElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: GitlabUser): User => ({
  id: String(user.id),
  displayName: user.name || user.username,
  email: user.email || '',
  additionalEmails: [],
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'gitlab-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'gitlab/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'gitlab/users.page_sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken: token, page });

      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) await elba.users.update({ users });

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'gitlab/users.page_sync.requested',
        data: {
          ...event.data,
          page: nextPage.toString(),
        },
      });
      return {
        status: 'ongoing',
      };
    }

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
