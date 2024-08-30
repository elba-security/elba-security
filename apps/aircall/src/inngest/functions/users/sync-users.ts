import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/aircall/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type AircallUser } from '@/connectors/aircall/users';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = ({ user, authUserId }: { user: AircallUser; authUserId: string }): User => {
  return {
    id: String(user.id),
    displayName: user.name,
    email: user.email,
    additionalEmails: [],
    isSuspendable: String(user.id) !== authUserId,
    url: `https://dashboard.aircall.io/users/${user.id}/general`,
  };
};

export const syncUsers = inngest.createFunction(
  {
    id: 'aircall-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
  },
  { event: 'aircall/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.accessToken,
        authUserId: organisationsTable.authUserId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({
      organisationId,
      region: organisation.region,
    });

    const token = await decrypt(organisation.token);
    const authUserId = organisation.authUserId;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ token, nextPageLink: page });

      const users = result.validUsers
        .filter(({ availability_status: status }) => status === 'available')
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
      await step.sendEvent('synchronize-users', {
        name: 'aircall/users.sync.requested',
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
