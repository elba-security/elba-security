import type { User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/docusign/users';
import { inngest } from '@/inngest/client';
import { type DocusignUser } from '@/connectors/docusign/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { getAuthUser } from '@/connectors/docusign/auth';

const formatElbaUserDisplayName = (user: DocusignUser) => {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }

  return user.email;
};

const formatElbaUser = ({
  user,
  authUserId,
}: {
  user: DocusignUser;
  authUserId: string;
}): User => ({
  id: user.userId,
  displayName: formatElbaUserDisplayName(user),
  role: user.permissionProfileName,
  email: user.email,
  additionalEmails: [],
  isSuspendable: user.userId !== authUserId,
  url: `https://apps.docusign.com/admin/edit-user/${user.userId}`, // Development base url:  https://apps-d.docusign.com
});

export const syncUsers = inngest.createFunction(
  {
    id: 'docusign-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'docusign/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'docusign/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'docusign/users.sync.requested' },
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

      const { authUserId, apiBaseUri, accountId } = await getAuthUser(credentials.access_token);

      const result = await getUsers({
        accessToken: credentials.access_token,
        accountId,
        apiBaseUri,
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
      await step.sendEvent('synchronize-users', {
        name: 'docusign/users.sync.requested',
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
