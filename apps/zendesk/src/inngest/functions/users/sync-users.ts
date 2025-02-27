import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser, getOwnerId } from '@/connectors/zendesk/users';
import { nangoAPIClient } from '@/common/nango';
import { type ZendeskUser } from '@/connectors/zendesk/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';

const formatElbaUser = ({
  user,
  subDomain,
  authUserId,
  ownerId,
}: {
  user: ZendeskUser;
  subDomain: string;
  ownerId: string;
  authUserId: string;
}): User => ({
  id: String(user.id),
  displayName: user.name,
  email: user.email,
  role: user.role,
  additionalEmails: [],
  isSuspendable: ![ownerId, authUserId].includes(String(user.id)),
  url: `https://${subDomain}.zendesk.com/admin/people/team/members/${user.id}`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'zendesk-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'zendesk/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'zendesk/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'zendesk/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials, connection_config: connectionConfig } =
        await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new Error('Could not retrieve Nango credentials');
      }
      const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);
      if (!nangoConnectionConfigResult.success) {
        throw new Error('Could not retrieve Nango connection config data');
      }

      const subDomain = nangoConnectionConfigResult.data.subdomain;
      const accessToken = credentials.access_token;

      const result = await getUsers({ accessToken, page, subDomain });
      const { authUserId } = await getAuthUser({ accessToken, subDomain });
      const { ownerId } = await getOwnerId({ accessToken, subDomain });

      const users = result.validUsers
        .filter(({ active }) => active)
        .map((user) => formatElbaUser({ user, subDomain, ownerId, authUserId }));

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
        name: 'zendesk/users.sync.requested',
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
