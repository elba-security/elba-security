import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/linear/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type LinearUser } from '@/connectors/linear/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({
  user,
  workspaceUrlKey,
  authUserId,
}: {
  user: LinearUser;
  workspaceUrlKey: string;
  authUserId: string;
}): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  isSuspendable: user.id !== authUserId,
  url: `https://linear.app/${workspaceUrlKey}/settings/members`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'linear-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'linear/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'linear/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'linear/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        region: organisationsTable.region,
        authUserId: organisationsTable.authUserId,
        workspaceUrlKey: organisationsTable.workspaceUrlKey,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);
    const authUserId = organisation.authUserId;
    const workspaceUrlKey = organisation.workspaceUrlKey;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken: token, afterCursor: page });

      const users = result.validUsers
        .filter(({ active }) => active)
        .map((user) => formatElbaUser({ user, authUserId, workspaceUrlKey }));

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'linear/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage.toString(),
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
