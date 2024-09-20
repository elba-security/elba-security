import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/fivetran/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type FivetranUser } from '@/connectors/fivetran/users';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';

const formatElbaUserDisplayName = (user: FivetranUser) => {
  if (user.given_name || user.family_name) {
    return `${user.given_name || ''} ${user.family_name || ''}`.trim();
  }

  return user.email;
};

const formatElbaUser = ({
  user,
  authUserId,
}: {
  user: FivetranUser;
  authUserId: string;
}): User => ({
  id: user.id,
  displayName: formatElbaUserDisplayName(user),
  email: user.email,
  role: user.role || undefined,
  additionalEmails: [],
  isSuspendable: user.id !== authUserId,
  url: `https://fivetran.com/dashboard/account/users-permissions/users/${user.id}/destinations`,
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'fivetran-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'fivetran/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'fivetran/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'fivetran/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        apiSecret: organisationsTable.apiSecret,
        authUserId: organisationsTable.authUserId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const { apiKey, apiSecret, authUserId } = organisation;

    const decryptedApiKey = await decrypt(apiKey);
    const decryptedApiSecret = await decrypt(apiSecret);

    const elba = createElbaClient({ organisationId, region: organisation.region });

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey: decryptedApiKey,
        apiSecret: decryptedApiSecret,
        cursor: page,
      });

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
        name: 'fivetran/users.sync.requested',
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
