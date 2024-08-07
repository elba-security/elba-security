import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/statsig/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type StatsigUser } from '@/connectors/statsig/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';

const formatElbaUserDisplayName = (user: StatsigUser) => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  return user.email;
};

const formatElbaUser = (user: StatsigUser): User => ({
  id: user.email,
  email: user.email,
  displayName: formatElbaUserDisplayName(user),
  role: user.role, // Owner | admin | member (Note: 'Owner' role starts with capital letter)
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'statsig-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.STATSIG_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'statsig/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'statsig/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'statsig/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt } = event.data;

    const [organisation] = await db
      .select({
        apiKey: organisationsTable.apiKey,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region: organisation.region });

    const apiKey = await decrypt(organisation.apiKey);

    await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey,
      });

      const users = result.validUsers.map(formatElbaUser);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) {
        await elba.users.update({ users });
      }
    });

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
