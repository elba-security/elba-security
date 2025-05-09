import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { nangoConnectionConfigSchema, nangoCredentialsSchema } from '@/connectors/common/nango';
import { getUsers, getAuthUser } from '@/connectors/freshdesk/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type FreshdeskUser } from '@/connectors/freshdesk/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = ({
  user,
  subDomain,
  authUserEmail,
}: {
  user: FreshdeskUser;
  subDomain: string;
  authUserEmail: string;
}): User => ({
  id: String(user.id),
  displayName: user.contact.name,
  email: user.contact.email,
  additionalEmails: [],
  url: `https://${subDomain}.freshdesk.com/a/admin/agents/${user.id}/edit`,
  isSuspendable: user.contact.email !== authUserEmail,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'freshdesk-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'freshdesk/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'freshdesk/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'freshdesk/users.sync.requested' },
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
      const subDomain = nangoConnectionConfigResult.data.subdomain;

      const result = await getUsers({
        userName: nangoCredentialsResult.data.username,
        password: nangoCredentialsResult.data.password,
        subDomain,
        page,
      });
      const { authUserEmail } = await getAuthUser({
        userName: nangoCredentialsResult.data.username,
        password: nangoCredentialsResult.data.password,
        subDomain,
      });

      const users = result.validUsers
        .filter((user) => user.contact.active)
        .map((user) => formatElbaUser({ user, subDomain, authUserEmail }));

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
        name: 'freshdesk/users.sync.requested',
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
