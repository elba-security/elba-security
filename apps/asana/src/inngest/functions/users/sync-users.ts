import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers, getAuthUser } from '@/connectors/asana/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { nangoAPIClient } from '@/common/nango/api';
import { type AsanaUser } from '@/connectors/asana/users';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUser = ({ user, authUserId }: { user: AsanaUser; authUserId: string }): User => ({
  id: user.gid,
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
  isSuspendable: user.gid !== authUserId,
});

export const syncUsers = inngest.createFunction(
  {
    id: 'asana-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'asana/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'asana/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'asana/users.sync.requested' },
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

      const result = await getUsers({ accessToken: credentials.access_token, page });
      const { authUserId } = await getAuthUser(credentials.access_token);

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
      await step.sendEvent('synchronize-users', {
        name: 'asana/users.sync.requested',
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
