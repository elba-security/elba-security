import { type User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { getUsers, getAuthUser } from '@/connectors/datadog/users';
import { type DatadogUser } from '@/connectors/datadog/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoConnectionConfigSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';
import { getDatadogRegionURL } from '@/connectors/datadog/regions';

const formatElbaUserAuthMethod = (user: DatadogUser) => {
  if (user.attributes.mfa_enabled) {
    return 'mfa';
  }
  return 'password';
};
const formatElbaUserDisplayName = (user: DatadogUser) => {
  if (user.attributes.name === '') {
    return user.attributes.email;
  }
  return user.attributes.name;
};

const formatElbaUserURL = ({ user, sourceRegion }: { user: DatadogUser; sourceRegion: string }) => {
  const url = getDatadogRegionURL(sourceRegion);
  return `${url}/organization-settings/users?user_id=${user.id}`;
};

const formatElbaUser = ({
  user,
  sourceRegion,
  authUserId,
}: {
  user: DatadogUser;
  sourceRegion: string;
  authUserId: string;
}): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.attributes.email,
  authMethod: formatElbaUserAuthMethod(user),
  additionalEmails: [],
  isSuspendable: authUserId !== user.id,
  url: formatElbaUserURL({ user, sourceRegion }),
});

export const syncUsers = inngest.createFunction(
  {
    id: 'datadog-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'datadog/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'datadog/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'datadog/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials, connection_config: connectionConfig } =
        await nangoAPIClient.getConnection(nangoConnectionId, 'API_KEY');
      const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);
      if (!nangoConnectionConfigResult.success) {
        throw new Error('Could not retrieve Nango connection config data');
      }

      const apiKey = credentials.apiKey;
      const appKey = nangoConnectionConfigResult.data.applicationKey;
      const sourceRegion = nangoConnectionConfigResult.data.siteParameter;
      const { authUserId } = await getAuthUser({
        apiKey,
        appKey,
        sourceRegion,
      });

      const result = await getUsers({
        apiKey,
        appKey,
        sourceRegion,
        page,
      });

      const users = result.validUsers.map((user) =>
        formatElbaUser({ user, sourceRegion, authUserId })
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
      await step.sendEvent('synchronize-users', {
        name: 'datadog/users.sync.requested',
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
