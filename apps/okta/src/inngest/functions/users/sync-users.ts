import type { User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { getUsers, getAuthUser } from '@/connectors/okta/users';
import { type OktaUser } from '@/connectors/okta/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';

const formatElbaUserDisplayName = (user: OktaUser) => {
  if (user.profile.firstName && user.profile.lastName) {
    return `${user.profile.firstName} ${user.profile.lastName}`;
  }
  return user.profile.email;
};

const formatElbaUser = ({
  subDomain,
  user,
  ownerId,
}: {
  subDomain: string;
  user: OktaUser;
  ownerId: string;
}): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.profile.email,
  authMethod: undefined,
  additionalEmails: [],
  isSuspendable: user.id !== ownerId,
  url: `https://${subDomain}-admin.okta.com/admin/user/profile/view/${user.id}`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'okta-sync-users',
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
        event: 'okta/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'okta/app.installed',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'okta/users.sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, nangoConnectionId, syncStartedAt, region, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials, connection_config: connectionConfig } =
        await nangoAPIClient.getConnection(nangoConnectionId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

      if (!nangoConnectionConfigResult.success) {
        throw new Error('Could not retrieve Nango connection config data');
      }

      const ownerId = await getAuthUser({
        token: credentials.access_token,
        subDomain: nangoConnectionConfigResult.data.subdomain,
      });

      const subDomain = nangoConnectionConfigResult.data.subdomain;
      const result = await getUsers({
        token: credentials.access_token,
        subDomain,
        page,
      });
      const users = result.validUsers.map((user) =>
        formatElbaUser({
          subDomain,
          user,
          ownerId,
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
        name: 'okta/users.sync.requested',
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
