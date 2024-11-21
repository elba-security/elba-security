import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getAuthUser, getUsers } from '@/connectors/salesloft/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { nangoAPIClient } from '@/common/nango/api';
import { type SalesloftUser } from '@/connectors/salesloft/users';
import { createElbaClient } from '@/connectors/elba/client';

// TODO: Fetch Role
// We could fetch the user role from the Admin | User | custom role(it should be fetch from roles api, it may have pagination)
const formatElbaUser = ({
  user,
  authUserId,
}: {
  user: SalesloftUser;
  authUserId: number;
}): User => ({
  id: String(user.id),
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  isSuspendable: String(user.id) !== String(authUserId),
  role: ['Admin', 'User'].includes(user.role.id) ? user.role.id : undefined,
  url: 'https://app.salesloft.com/app/settings/users/active',
});

export const syncUsers = inngest.createFunction(
  {
    id: 'salesloft-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'salesloft/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'salesloft/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'salesloft/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });

    const nextPage = await step.run('list-users', async () => {
      const { credentials } = await nangoAPIClient.getConnection(organisationId);

      if (!('access_token' in credentials) || typeof credentials.access_token !== 'string') {
        throw new NonRetriableError(
          `Nango credentials are missing or invalid for the organisation with id=${organisationId}`
        );
      }

      const result = await getUsers({
        accessToken: credentials.access_token,
        page,
      });

      const { id: authUserId } = await getAuthUser(credentials.access_token);

      const users = result.validUsers.map((user) => formatElbaUser({ user, authUserId }));

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
        name: 'salesloft/users.sync.requested',
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
