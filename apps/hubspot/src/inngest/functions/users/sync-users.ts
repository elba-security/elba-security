import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser, getAccountInfo } from '@/connectors/hubspot/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { type HubspotUser } from '@/connectors/hubspot/users';

const formatElbaUserDisplayName = (user: HubspotUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
};

const formatElbaUser =
  ({
    uiDomain,
    portalId,
    authUserId,
  }: {
    uiDomain: string;
    portalId: number;
    authUserId: string;
  }) =>
  (user: HubspotUser): User => ({
    id: user.id,
    displayName: formatElbaUserDisplayName(user),
    email: user.email,
    role: user.superAdmin ? 'admin' : 'user',
    additionalEmails: [],
    isSuspendable: !user.superAdmin && user.id !== authUserId,
    url: `https://${uiDomain}/settings/${portalId}/users/user/${user.id}`,
  });

export const syncUsers = inngest.createFunction(
  {
    id: 'hubspot-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'hubspot/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'hubspot/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'hubspot/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });
    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'OAUTH2');

      const result = await getUsers({ accessToken: credentials.access_token, page });
      const { authUserId } = await getAuthUser(credentials.access_token);
      const { portalId, uiDomain } = await getAccountInfo(credentials.access_token);

      const users = result.validUsers.map(formatElbaUser({ uiDomain, portalId, authUserId }));

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
        name: 'hubspot/users.sync.requested',
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
