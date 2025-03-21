import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/pandadoc/users';
import { inngest } from '@/inngest/client';
import { type PandadocUser } from '@/connectors/pandadoc/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';
import { env } from '@/common/env';

const formatElbaUserDisplayName = (user: PandadocUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const formatElbaUser = (user: PandadocUser): User => ({
  id: user.user_id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  additionalEmails: [],
  url: `https://app.pandadoc.com/a/#/settings/users/${user.user_id}`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'pandadoc-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.PANDADOC_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'pandadoc/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'pandadoc/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'pandadoc/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });
    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
      if (!nangoCredentialsResult.success) {
        throw new Error('Could not retrieve Nango credentials');
      }

      const result = await getUsers({
        apiKey: nangoCredentialsResult.data.apiKey,
        page,
      });

      const users = result.validUsers.map(formatElbaUser);

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
        name: 'pandadoc/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return { status: 'ongoing' };
    }

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return { status: 'completed' };
  }
);
