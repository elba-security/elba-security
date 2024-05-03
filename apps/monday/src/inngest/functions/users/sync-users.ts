import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { type MondayUser, getUsers } from '@/connectors/monday/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: MondayUser): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'monday-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'monday/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'monday/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'monday/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, page, syncStartedAt } = event.data;

    const { token, region } = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({ token: organisationsTable.token, region: organisationsTable.region })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      return organisation;
    });

    const elba = createElbaClient({
      organisationId,
      region,
    });

    const decryptedToken = await decrypt(token);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        token: decryptedToken,
        page,
      });
      const users = result.validUsers.map(formatElbaUser);
      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid users', {
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
      await step.sendEvent('sync-users-page', {
        name: 'monday/users.sync.requested',
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
