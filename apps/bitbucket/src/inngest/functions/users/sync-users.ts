import type { User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { getWorkspaces } from '@/connectors/bitbucket/workspaces';
import { getUsers, getAuthUser } from '@/connectors/bitbucket/users';
import { type BitbucketUser } from '@/connectors/bitbucket/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({
  user,
  authUserId,
}: {
  user: BitbucketUser;
  authUserId: string;
}): User => ({
  id: user.user.uuid,
  displayName: user.user.display_name,
  additionalEmails: [],
  isSuspendable: authUserId !== user.user.uuid,
  url: `https://bitbucket.org/${user.workspace.slug}/workspace/settings/user-directory`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'bitbucket-sync-users',
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
        event: 'bitbucket/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'bitbucket/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'bitbucket/users.sync.requested' },
  async ({ event, step, logger }) => {
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
      const workspaceIds = await getWorkspaces(credentials.access_token);
      const { uuid: authUserId } = await getAuthUser(credentials.access_token);

      const result = await getUsers({
        accessToken: credentials.access_token,
        workspaceId: workspaceIds[0].uuid, // TODO: We should not pick the first workspace, it must be selected by the user
        page,
      });

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
      await step.sendEvent('sync-users', {
        name: 'bitbucket/users.sync.requested',
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
