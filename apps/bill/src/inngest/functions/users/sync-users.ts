import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser } from '@/connectors/bill/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type BillUser } from '@/connectors/bill/users';
import { nangoCredentialsSchema } from '@/connectors/common/nango';
import { nangoAPIClient } from '@/common/nango';

const formatElbaUserDisplayName = (user: BillUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
};

const formatElbaUser = ({ user, authUserId }: { user: BillUser; authUserId: string }): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  additionalEmails: [],
  url: `https://app-stage02.us.bill.com/neo3/settings/roles-and-permissions/users/${user.id}/profile`,
  isSuspendable: user.id !== authUserId,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'bill-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'bill/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'bill/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'bill/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId, 'BILL');
      const nangoCredentialsResult = nangoCredentialsSchema.safeParse(credentials);
      if (!nangoCredentialsResult.success) {
        throw new Error('Could not retrieve Nango credentials');
      }

      const result = await getUsers({
        devKey: nangoCredentialsResult.data.dev_key,
        sessionId: nangoCredentialsResult.data.session_id,
        page,
      });
      const { authUserId } = await getAuthUser({
        devKey: nangoCredentialsResult.data.dev_key,
        sessionId: nangoCredentialsResult.data.session_id,
      });

      const users = result.validUsers
        .filter(({ archived }) => !archived)
        .map((user) => formatElbaUser({ user, authUserId }));

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
        name: 'bill/users.sync.requested',
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
