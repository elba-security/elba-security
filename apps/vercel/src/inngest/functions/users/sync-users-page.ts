import { Elba, type User } from '@elba-security/sdk';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { type VercelUser, getUsers} from '@/connectors/users'; 
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: VercelUser): User => ({
  id: user.uid,
  displayName: user.name || user.email,
  email: user.email,
  role: user.role,
  authMethod: 'password', 
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'vercel-sync-users-page',
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
        event: 'vercel/elba_app.uninstalled',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'vercel/users.page_sync.requested' }, 
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, region, page } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          token: Organisation.token,
          teamId: Organisation.teamId, 
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });


    const nextPage = await step.run('list-users', async () => {
      // retrieve this users page
      const result = await getUsers(organisation.token,organisation.teamId,page);
      // format each Vercel user to Elba users
      const users = result.members.map(formatElbaUser);
      // send the batch of users to Elba
      logger.debug('Sending batch of users to Elba: ', { organisationId, users });
      await elba.users.update({ users });

      if (result.pagination.next) {

        return result.pagination.next;
      }
      return null;
    });

    // if there is a next page, enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'vercel/users.page_sync.requested', 
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


