import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { getUsers, getAuthUser } from '@/connectors/aircall/users';
import { inngest } from '@/inngest/client';
import { nangoAPIClient } from '@/common/nango';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type AircallUser } from '@/connectors/aircall/users';

const formatElbaUser = ({ user, authUserId }: { user: AircallUser; authUserId: string }): User => {
  return {
    id: String(user.id),
    displayName: user.name,
    email: user.email,
    additionalEmails: [],
    isSuspendable: String(user.id) !== authUserId,
    url: `https://dashboard.aircall.io/users/${user.id}/general`,
  };
};

export const syncUsers = inngest.createFunction(
  {
    id: 'aircall-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
  },
  { event: 'aircall/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const result = await getUsers({ token: credentials.access_token, nextPageLink: page });
      const { authUserId } = await getAuthUser(credentials.access_token);

      const users = result.validUsers.map((user) => formatElbaUser({ user, authUserId }));

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
        name: 'aircall/users.sync.requested',
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
