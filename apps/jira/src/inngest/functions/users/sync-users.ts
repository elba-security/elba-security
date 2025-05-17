import { type User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { type JiraUser, getUsers } from '@/connectors/jira/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';
import { getAuthUser } from '@/connectors/jira/users';

const formatElbaUser = ({
  user,
  domain,
  authUserId,
}: {
  user: JiraUser;
  domain: string;
  authUserId: string;
}): User => ({
  id: user.accountId,
  displayName: user.displayName,
  email: user.emailAddress,
  additionalEmails: [],
  isSuspendable: String(user.accountId) !== authUserId,
  url: `https://${domain}.atlassian.net/jira/people/${user.accountId}`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'jira-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'jira/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'jira/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'jira/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
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

      const apiToken = nangoCredentialsResult.data.password;
      const email = nangoCredentialsResult.data.username;
      const domain = nangoConnectionConfigResult.data.subdomain;

      const result = await getUsers({ apiToken, domain, email, page });
      const { authUserId } = await getAuthUser({ apiToken, domain, email });

      const users = result.validUsers.map((user) => formatElbaUser({ user, domain, authUserId }));

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
        name: 'jira/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage.toString(),
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
