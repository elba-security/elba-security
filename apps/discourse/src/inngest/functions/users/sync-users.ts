import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/discourse/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { type DiscourseUser } from '@/connectors/discourse/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({
  user,
  defaultHost,
}: {
  user: DiscourseUser;
  defaultHost: string;
}): User => ({
  id: String(user.id),
  displayName: user.username,
  email: user.email ?? undefined,
  additionalEmails: [],
  url: `https://${defaultHost}/admin/users/${user.id}/${user.username}`,
  isSuspendable: user.can_be_deleted,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'discourse-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'discourse/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'discourse/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'discourse/users.sync.requested' },
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

      const defaultHost = nangoConnectionConfigResult.data.defaultHost;
      const result = await getUsers({
        apiKey: nangoCredentialsResult.data.apiKey,
        defaultHost,
        apiUsername: nangoConnectionConfigResult.data.apiUsername,
        page,
      });

      const users = result.validUsers
        .filter(({ active, id }) => active && id > 0) // filter a discordbot and system user
        .map((user) => formatElbaUser({ user, defaultHost }));

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
        name: 'discourse/users.sync.requested',
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
