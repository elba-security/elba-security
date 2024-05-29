import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/intercom/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type IntercomUser } from '@/connectors/intercom/users';
import { createElbaClient } from '@/connectors/elba/client';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: IntercomUser): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  additionalEmails: [],
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'intercom-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    cancelOn: [
      {
        event: 'intercom/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'intercom/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'intercom/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({ token: organisationsTable.accessToken, region: organisationsTable.region })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const token = await decrypt(organisation.token);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken: token, next: page });

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

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'intercom/users.sync.requested',
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
