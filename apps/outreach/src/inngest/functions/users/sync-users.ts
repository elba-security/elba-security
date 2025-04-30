import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/outreach/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type OutreachUser } from '@/connectors/outreach/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: OutreachUser) => {
  if (user.attributes.firstName && user.attributes.lastName) {
    return `${user.attributes.firstName} ${user.attributes.lastName}`;
  }
  return user.attributes.email;
};

const formatElbaUser = ({ user }: { user: OutreachUser }): User => ({
  id: String(user.id),
  displayName: formatElbaUserDisplayName(user),
  email: user.attributes.email,
  additionalEmails: [],
  url: `https://web.outreach.io/admin-exp/users`,
  isSuspendable: true, // unable to determine the owner
});

export const syncUsers = inngest.createFunction(
  {
    id: 'outreach-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'outreach/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'outreach/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'outreach/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const result = await getUsers({
        accessToken: credentials.access_token,
        page,
      });

      const users = result.validUsers
        .filter(({ attributes }) => !attributes.locked)
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
        name: 'outreach/users.sync.requested',
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
