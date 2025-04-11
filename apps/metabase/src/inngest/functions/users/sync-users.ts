import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/metabase/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type MetabaseUser } from '@/connectors/metabase/users';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: MetabaseUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const formatElbaUser = ({ user, domain }: { user: MetabaseUser; domain: string }): User => ({
  id: String(user.id),
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.is_superuser ? 'admin' : 'user',
  additionalEmails: [],
  url: `https://${domain}.metabase.com/admin/people/${user.id}/edit`,
  isSuspendable: true, // can't determine the owner
});

export const syncUsers = inngest.createFunction(
  {
    id: 'metabase-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'metabase/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'metabase/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'metabase/users.sync.requested' },
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

      const result = await getUsers({
        apiKey: nangoCredentialsResult.data.apiKey,
        domain: nangoConnectionConfigResult.data.domain,
        page,
      });

      const users = result.validUsers.map((user) =>
        formatElbaUser({ user, domain: nangoConnectionConfigResult.data.domain })
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
        name: 'metabase/users.sync.requested',
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
