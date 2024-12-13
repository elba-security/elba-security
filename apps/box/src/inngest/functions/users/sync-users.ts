import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser } from '@/connectors/box/users';
import { type BoxUser } from '@/connectors/box/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { env } from '@/common/env';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({ user, authUserId }: { user: BoxUser; authUserId: string }): User => ({
  id: user.id,
  displayName: user.name,
  email: user.login,
  additionalEmails: [],
  isSuspendable: String(user.id) !== authUserId,
  url: `https://app.box.com/master/users/${user.id}`,
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'box-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.BOX_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'box/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'box/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'box/users.sync.requested' },
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
      const result = await getUsers({ accessToken: credentials.access_token, nextPage: page });
      const { authUserId } = await getAuthUser(credentials.access_token);

      const users = result.validUsers
        .filter((user) => user.status === 'active')
        .map((user) => formatElbaUser({ user, authUserId }));

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) await elba.users.update({ users });

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'box/users.sync.requested',
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
