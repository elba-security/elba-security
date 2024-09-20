import type { User } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { getUsers } from '@/connectors/box/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { type BoxUser } from '@/connectors/box/users';
import { createElbaClient } from '@/connectors/elba/client';
import { env } from '@/common/env';

const formatElbaUser = ({ user, authUserId }: { user: BoxUser; authUserId: string }): User => ({
  id: user.id,
  displayName: user.name,
  email: user.login,
  additionalEmails: [],
  isSuspendable: String(user.id) !== authUserId,
  url: `https://app.box.com/master/users/${user.id}`,
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'box-synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: env.BOX_USERS_SYNC_CONCURRENCY,
    },
    cancelOn: [
      {
        event: 'box/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'box/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'box/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const [organisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        authUserId: organisationsTable.authUserId,
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));
    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });
    const accessToken = await decrypt(organisation.accessToken);
    const authUserId = organisation.authUserId;

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ accessToken, nextPage: page });

      const users = result.validUsers
        .filter((user) => user.status === 'active')
        .map((user) => formatElbaUser({ user, authUserId }));

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }

      if (users.length > 0) await elba.users.update({ users });

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'box/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage.toString(),
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
