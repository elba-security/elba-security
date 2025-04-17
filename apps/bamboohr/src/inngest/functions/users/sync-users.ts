import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { getUsers } from '@/connectors/bamboohr/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type BamboohrUser } from '@/connectors/bamboohr/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: BamboohrUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
};

const formatElbaUser = ({ user, subDomain }: { user: BamboohrUser; subDomain: string }): User => ({
  id: String(user.employeeId),
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  additionalEmails: [],
  url: `https://${subDomain}.bamboohr.com/employees/list?pin`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'bamboohr-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'bamboohr/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'bamboohr/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'bamboohr/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const { credentials, connection_config: connectionConfig } =
      await nangoAPIClient.getConnection(nangoConnectionId);

    const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);

    if (!nangoCredentialsResult.success) {
      throw new Error('Could not retrieve Nango credentials');
    }

    const nangoConnectionConfigResult = nangoConnectionConfigSchema.safeParse(connectionConfig);

    if (!nangoConnectionConfigResult.success) {
      throw new Error('Could not retrieve Nango connection config data');
    }

    const subDomain = nangoConnectionConfigResult.data.subdomain;
    const result = await getUsers({
      userName: nangoCredentialsResult.data.username,
      password: nangoCredentialsResult.data.password,
      subDomain,
    });

    const users = result.validUsers
      .filter(({ status }) => status === 'enabled')
      .map((user) => formatElbaUser({ user, subDomain }));

    if (result.invalidUsers.length > 0) {
      logger.warn('Retrieved users contains invalid data', {
        organisationId,
        invalidUsers: result.invalidUsers,
      });
    }

    if (users.length > 0) {
      await elba.users.update({ users });
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
