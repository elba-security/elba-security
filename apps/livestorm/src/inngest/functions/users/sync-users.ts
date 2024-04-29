import { type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { type LivestormUser, getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';

const formatElbaUserDisplayName = (user: LivestormUser['attributes']) => {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }

  return user.email;
};

const formatElbaUser = ({ id, attributes }: LivestormUser): User => ({
  id,
  displayName: formatElbaUserDisplayName(attributes),
  role: attributes.role,
  email: attributes.email,
  authMethod: undefined,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'livestorm-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.LIVESTORM_USERS_SYNC_CONCURRENCY,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'livestorm/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'livestorm/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'livestorm/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        token: organisationsTable.token,
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

    const decryptedToken = await decrypt(organisation.token);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers(decryptedToken, page);

      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0 || result.invitedUsers.length > 0) {
        logger.warn('Retrieved users contains invalid or invited users', {
          organisationId,
          invalidUsers: result.invalidUsers,
          invitedUsers: result.invitedUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'livestorm/users.sync.requested',
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
