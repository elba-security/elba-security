import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/apollo/users';
import { inngest } from '@/inngest/client';
import { type ApolloUser } from '@/connectors/apollo/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = (user: ApolloUser): User => ({
  id: user.id,
  displayName: user.name || user.email,
  email: user.email,
  additionalEmails: [],
  url: `https://app.apollo.io/#/users/${user.id}/edit`,
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'apollo-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'apollo/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'apollo/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'apollo/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');

      const result = await getUsers({
        apiKey: credentials.apiKey,
        after: page,
      });

      const users = result.validUsers
        .filter(({ deleted }) => !deleted)
        .map((user) => formatElbaUser(user));

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
        name: 'apollo/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
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
