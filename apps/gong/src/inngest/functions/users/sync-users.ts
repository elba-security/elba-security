import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { getUsers } from '@/connectors/gong/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type GongUser } from '@/connectors/gong/users';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: GongUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.emailAddress;
};

const formatElbaUser = ({ user }: { user: GongUser; }): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.emailAddress,
  additionalEmails: [],
  url: `https://app.gong.io/company/team-members`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'gong-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'gong/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'gong/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'gong/users.sync.requested' },
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
        userName: nangoCredentialsResult.data.username,
        password: nangoCredentialsResult.data.password,
        page,
      });

      const users = result.validUsers
        .filter(({ active }) => active)
        .map((user) => formatElbaUser({ user }));

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
        name: 'gong/users.sync.requested',
        data: {
          ...event.data,
          page: String(nextPage),
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
