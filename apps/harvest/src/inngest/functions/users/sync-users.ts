import type { User } from '@elba-security/sdk';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers, getCompanyDomain, getAuthUser } from '@/connectors/harvest/users';
import { nangoAPIClient } from '@/common/nango';
import { createElbaOrganisationClient } from '@/connectors/elba/client';
import { type HarvestUser } from '@/connectors/harvest/users';

const formatElbaUserDisplayName = (user: HarvestUser) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.email;
};

const findUserRole = (user: HarvestUser) => {
  if (user.access_roles.includes('administrator')) {
    return 'administrator';
  }

  if (user.access_roles.includes('manager')) {
    // Users with the manager role can additionally be granted one or more of these roles
    // Elba accepts only one role, so we prioritize the roles in the following order:
    // DOC: https://help.getharvest.com/api-v2/users-api/users/users
    return 'manager';
  }

  return 'member';
};

const formatElbaUser = ({
  user,
  authUserId,
  companyDomain,
}: {
  user: HarvestUser;
  authUserId: string;
  companyDomain: string;
}): User => ({
  id: String(user.id),
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: findUserRole(user),
  additionalEmails: [],
  url: `https://${companyDomain}/people/${user.id}/edit`,
  isSuspendable: String(user.id) !== authUserId,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'harvest-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'harvest/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'harvest/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'harvest/users.sync.requested' },
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

      const result = await getUsers({ accessToken: credentials.access_token, page });
      const { authUserId } = await getAuthUser(credentials.access_token);
      const { companyDomain } = await getCompanyDomain(credentials.access_token);

      const users = result.validUsers.map((user) =>
        formatElbaUser({ user, authUserId, companyDomain })
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
      await step.sendEvent('synchronize-users', {
        name: 'harvest/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    await step.run('finalize', () => {
      return elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() });
    });

    return {
      status: 'completed',
    };
  }
);
