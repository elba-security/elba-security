import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/dialpad/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type DialpadUser } from '@/connectors/dialpad/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: DialpadUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  if (user.emails[0] === undefined) {
    return user.display_name;
  }
  return user.emails[0];
};

const formatElbaUser = ({ user }: { user: DialpadUser }): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.emails[0],
  additionalEmails: [],
  url: `https://dialpad.com/accounts`,
  isSuspendable: !user.is_super_admin,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'dialpad-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'dialpad/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'dialpad/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'dialpad/users.sync.requested' },
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

      const result = await getUsers({
        accessToken: credentials.access_token,
        page,
      });

      const users = result.validUsers
        .filter(({ state }) => state === 'active')
        .map((user) => formatElbaUser({ user }));

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
      await step.sendEvent('sync-users', {
        name: 'dialpad/users.sync.requested',
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
