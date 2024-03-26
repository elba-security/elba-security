import { Elba, type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { type LivestormUser, getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: LivestormUser): User => ({
  id: user.id,
  displayName: user.attributes.first_name || user.attributes.last_name,
  role: user.attributes.role,
  email: user.attributes.email,
  authMethod: undefined,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'livestorm-sync-users-page',
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
        event: 'livestorm/elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'livestorm/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, region, page } = event.data;
    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    const token = await step.run('get-token', async () => {
      const [result] = await db
        .select({
          token: Organisation.token,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result.token;
    });
    const nextPage = await step.run('list-users', async () => {
      // retrieve this users page
      const result = await getUsers(token, page);
      // format each Livestorm user to Elba users
      const users = result.users.map(formatElbaUser);
      // send the batch of users to Elba
      logger.debug('Sending batch of users to Elba: ', { organisationId, users });
      await elba.users.update({ users });

      if (result.pagination.page_count > 1) {
        return result.pagination.current_page + 1;
      }
      return null;
    });

    // if there is a next page, enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'livestorm/users.page_sync.requested',
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
