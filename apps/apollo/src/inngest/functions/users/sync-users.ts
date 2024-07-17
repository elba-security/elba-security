import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/apollo/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type ApolloUser } from '@/connectors/apollo/users';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: ApolloUser): User => ({
  id: user.id,
  displayName: user.name || user.email,
  email: user.email,
  additionalEmails: [],
  url: `https://app.apollo.io/#/users/${user.id}/edit`,
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'apollo-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'apollo/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'apollo/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 3,
  },
  { event: 'apollo/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

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

    const decryptedApiKey = await decrypt(organisation.apiKey);

    const elba = createElbaClient({ organisationId, region: organisation.region });

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiKey: decryptedApiKey,
        after: page,
      });

      const users = result.validUsers
        .filter(({ deleted }) => !deleted)
        .map((user) => formatElbaUser(user));

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
        name: 'apollo/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
