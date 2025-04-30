import type { User } from '@elba-security/sdk';
import { getMurals, getUsers, getWorkspaceIds } from '@/connectors/mural/users';
import { type MuralUser } from '@/connectors/mural/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: MuralUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
};

const formatElbaUser = ({ workspaceId, user }: { workspaceId: string; user: MuralUser }): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  authMethod: undefined,
  additionalEmails: [],
  url: `https://app.mural.co/t/${workspaceId}/settings/members`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'mural-sync-users',
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
        event: 'mural/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'mural/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'mural/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, syncStartedAt, region, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');
      const workspaceId = await getWorkspaceIds(credentials.access_token);
      const muralId = await getMurals({
        token: credentials.access_token,
        workspaceId,
      });

      const result = await getUsers({
        token: credentials.access_token,
        muralId,
        page,
      });
      const users = result.validUsers.map((user) =>
        formatElbaUser({
          workspaceId,
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
        name: 'mural/users.sync.requested',
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
