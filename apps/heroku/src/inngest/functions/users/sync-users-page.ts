import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/users';
import { type HerokuUser } from '@/connectors/types';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: HerokuUser): User => ({
  id: user.user.id,
  displayName: user.user.email,
  email: user.user.email,
  role: 'member',
  authMethod: user.two_factor_authentication ? 'mfa' : 'password',
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'heroku-sync-users-page',
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
        event: 'heroku/app.uninstall.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'heroku/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, range, region } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the Heroku API Access Token and team Id
    const [accessToken, teamId] = await step.run('get-access-token', async () => {
      const [organisation] = await db
        .select({
          accessToken: Organisation.accessToken,
          teamId: Organisation.teamId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return [organisation.accessToken, organisation.teamId];
    });

    const nextRange = await step.run('list-users', async () => {
      if (!accessToken || !teamId) {
        throw new Error('Access token or team Id is undefined.');
      }
      // retrieve this users page
      const result = await getUsers(accessToken, teamId, range);
      // format each Heroku User to elba user
      const users = result.users.map(formatElbaUser);
      // send the batch of users to elba
      logger.debug('Sending batch of users to elba: ', {
        organisationId,
        users,
      });
      await elba.users.update({ users });

      if (result.pagination.nextRange) {
        return result.pagination.nextRange;
      }
      return null;
    });

    // if there is a next range enqueue a new sync user event
    if (nextRange) {
      await step.sendEvent('sync-users-page', {
        name: 'heroku/users.page_sync.requested',
        data: {
          ...event.data,
          range: nextRange,
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
