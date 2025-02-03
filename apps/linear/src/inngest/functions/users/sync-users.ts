import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { getUsers, getAuthUser } from '@/connectors/linear/users';
import { type LinearUser } from '@/connectors/linear/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({
  user,
  authUserId,
  workspaceUrlKey,
}: {
  user: LinearUser;
  authUserId: string;
  workspaceUrlKey: string;
}): User => ({
  id: user.id,
  displayName: user.displayName,
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
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const result = await getUsers({ accessToken: credentials.access_token, afterCursor: page });
      const { authUserId } = await getAuthUser(credentials.access_token);

      const users = result.validUsers.map((user) =>
        formatElbaUser({ user, authUserId, workspaceUrlKey: result.workspaceUrlKey })
      );

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
