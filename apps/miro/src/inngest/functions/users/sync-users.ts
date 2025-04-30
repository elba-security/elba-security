import type { User } from '@elba-security/sdk';
import { getUsers, getTokenInfo } from '@/connectors/miro/users';
import { type MiroUser } from '@/connectors/miro/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({ orgId, user }: { orgId: string; user: MiroUser }): User => ({
  id: user.id,
  displayName: user.email,
  email: user.email,
  authMethod: undefined,
  additionalEmails: [],
  url: `https://miro.com/app/settings/company/${orgId}/users/`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'miro-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'miro/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'miro/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'miro/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, syncStartedAt, region, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
      const orgId = await getTokenInfo(credentials.access_token);

      const result = await getUsers({
        token: credentials.access_token,
        orgId,
        page,
      });
      const users = result.validUsers.map((user) =>
        formatElbaUser({
          orgId,
          user,
        })
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
      await step.sendEvent('sync-users', {
        name: 'miro/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
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
