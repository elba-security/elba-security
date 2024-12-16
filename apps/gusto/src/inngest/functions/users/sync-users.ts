import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser, getTokenInfo } from '@/connectors/gusto/users';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { nangoAPIClient } from '@/common/nango';
import { type GustoUser } from '@/connectors/gusto/users';

const formatElbaUserDisplayName = (user: GustoUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const formatElbaUser = ({
  user,
  authUserEmail,
}: {
  user: GustoUser;
  authUserEmail: string;
}): User => ({
  id: user.uuid,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  additionalEmails: [],
  isSuspendable: authUserEmail !== user.email,
  url: `https://app.gusto-demo.com/payroll_admin/people/employees/${user.uuid}`,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'gusto-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'gusto/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'gusto/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'gusto/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, nangoConnectionId, region, syncStartedAt, page } = event.data;

    const elba = createElbaOrganisationClient({
      organisationId,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(nangoConnectionId);
      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError('Could not retrieve Nango credentials');
      }

      const { companyId, adminId } = await getTokenInfo(credentials.access_token);
      const { authUserEmail } = await getAuthUser({
        accessToken: credentials.access_token,
        adminId,
        companyId,
      });

      const result = await getUsers({
        accessToken: credentials.access_token,
        page,
        companyId,
      });

      const users = result.validUsers
        .filter(({ terminated }) => !terminated)
        .map((user) => formatElbaUser({ user, authUserEmail }));

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
        name: 'gusto/users.sync.requested',
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
