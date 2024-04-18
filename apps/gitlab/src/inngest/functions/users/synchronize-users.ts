import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type GitlabUser, getUsers } from '@/connectors/gitlab/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = (user: GitlabUser): User => ({
  id: String(user.id),
  displayName: user.name || user.username,
  email: user.email,
  additionalEmails: [],
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'gitlab-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'gitlab/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient(organisationId, organisation.region);

    const nextPage = await step.run('list-users', async () => {
      const accessToken = await decrypt(organisation.accessToken);

      const result = await getUsers({ accessToken, page });

      const users = result.users.map(formatElbaUser);

      await elba.users.update({ users });

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'gitlab/users.sync.requested',
        data: {
          ...event.data,
          page: String(nextPage),
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
