import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/notion/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { type NotionUser } from '@/connectors/notion/users';

const formatElbaUser = (user: NotionUser): User => ({
  id: user.id,
  displayName: user.name,
  email: user.person.email,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'notion-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'notion/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'notion/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'notion/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });
    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const result = await getUsers({ accessToken: credentials.access_token, page });

      const users = result.validUsers
        .filter((user) => user.object === 'user' && user.type === 'person')
        .map(formatElbaUser);

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
        name: 'notion/users.sync.requested',
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
