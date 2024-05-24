import { type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { type MakeUser, getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '../../../common/crypto';
import { getElbaClient } from '../../../connectors/client';

const formatElbaUser = (user: MakeUser): User => ({
  id: user.id,
  displayName: user.name,
  email: user.email,
  role: 'member',
  authMethod: 'password',
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'make-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    cancelOn: [
      {
        event: 'make/elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'make/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, region, page } = event.data;

    const elba = getElbaClient({ organisationId, region });

    const organisation = await step.run('get-organisation', async () => {
      const [row] = await db
        .select({
          token: Organisation.token,
          teamId: Organisation.teamId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!row) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return row;
    });

    const nextPage = await step.run('list-users', async () => {
      const decryptedToken = await decrypt(organisation.token); 
      const result = await getUsers(decryptedToken, organisation.teamId, page);
      const users = result.users.map(formatElbaUser);
      logger.debug('Sending batch of users to Elba: ', { organisationId, users });
      await elba.users.update({ users });

      if (result.pagination.next) {
        return result.pagination.next;
      }
      return null;
    });

    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'make/users.page_sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    // delete the Elba users that have been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
