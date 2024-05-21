import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/doppler/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { type DopplerUser } from '@/connectors/doppler/users';
import { decrypt } from '@/common/crypto';
import { getElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';

const formatElbaUser = (user: DopplerUser): User => ({
  id: user.id,
  displayName: user.user.name,
  email: user.user.email,
  role: user.access,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'doppler-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.DOPPLER_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'doppler/app.installed',
        match: 'data.organisationId',
      },
      {
        event: 'doppler/app.uninstalled',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'doppler/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        apiToken: organisationsTable.apiToken,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = getElbaClient({ organisationId, region: organisation.region });

    const apiToken = await decrypt(organisation.apiToken);

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({
        apiToken,
        page,
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

      return result.nextPage;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'doppler/users.sync.requested',
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
