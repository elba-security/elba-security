import { type User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { type InstantlyUser, getUsers } from '@/connectors/instantly/users';
import { inngest } from '@/inngest/client';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUser = (user: InstantlyUser): User => ({
  id: user.id,
  displayName: user.email,
  email: user.email,
  additionalEmails: [],
  isSuspendable: true, // because we can fetch only workspace members, except for the owner
  url: 'https://app.instantly.ai/app/settings/account',
});

export const syncUsers = inngest.createFunction(
  {
    id: 'instantly-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'instantly/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'instantly/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'instantly/users.sync.requested' },
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

      const apiKey = nangoCredentialsResult.data.apiKey;

      const result = await getUsers({ apiKey, page });

      const users = result.validUsers
        .filter((user) => user.accepted)
        .map((user) => formatElbaUser(user));

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
        name: 'instantly/users.sync.requested',
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
