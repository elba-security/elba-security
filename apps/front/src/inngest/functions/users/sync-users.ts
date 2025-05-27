import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type FrontUser } from '@/connectors/front/users';
import { nangoAPIClient } from '@/common/nango';
import { getUsers } from '@/connectors/front/users';

const formatElbaUserDisplayName = (user: FrontUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const formatElbaUser = (user: FrontUser): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.is_admin ? 'admin' : 'member', //  it is not a good choice to define roles based on the is_admin field, however since  there are only two roles in the system, we can use this field to determine the role of the user
  additionalEmails: [],
  url: `https://app.frontapp.com/settings/global/teammates/edit/${user.username}/overview`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'front-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'front/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'front/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'front/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      // Teammates API doesn't support pagination (it is verified with support team)
      // https://dev.frontapp.com/reference/list-teammates
      const result = await getUsers(credentials.access_token);

      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }
    });

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
