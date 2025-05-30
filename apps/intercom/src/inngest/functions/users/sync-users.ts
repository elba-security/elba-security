import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser } from '@/connectors/intercom/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { type IntercomUser } from '@/connectors/intercom/users';

const formatElbaUser = ({
  user,
  workspaceId,
}: {
  user: IntercomUser;
  workspaceId: string;
}): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  url: `https://app.intercom.com/a/apps/${workspaceId}/settings/teammates/${user.id}/permissions`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'intercom-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'intercom/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'intercom/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'intercom/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });
    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const result = await getUsers({ accessToken: credentials.access_token, page });
      const { workspaceId } = await getAuthUser(credentials.access_token);

      const users = result.validUsers.map((user) => formatElbaUser({ user, workspaceId }));

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
        name: 'intercom/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return { status: 'ongoing' };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return { status: 'completed' };
  }
);
