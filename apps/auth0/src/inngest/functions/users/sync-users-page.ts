import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type Auth0User, getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { getToken } from '@/connectors/auth';

const formatElbaUser = (user: Auth0User): User => ({
  id: user.user_id,
  displayName: user.name,
  email: user.email,
  role: 'member',
  authMethod: undefined,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'auth0-sync-users-page',
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
        event: 'auth0/app.uninstall.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'auth0/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, region, page } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the Auth0 organization
    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          clientId: Organisation.clientId,
          clientSecret: Organisation.clientSecret,
          domain: Organisation.domain,
          audience: Organisation.audience,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    // get the Auth0 Management API access token
    const accessToken = await step.run('get-token', async () => {
      const tokenResponse = await getToken(
        organisation.clientId,
        organisation.clientSecret,
        organisation.audience,
        organisation.domain
      );
      return tokenResponse.access_token;
    });

    const nextPage = await step.run('list-users', async () => {
      // retrieve this users page
      const result = await getUsers(accessToken, organisation.domain, page);
      // format each Auth0 User to elba user
      const users = result.users.map(formatElbaUser);
      // send the batch of users to elba
      logger.debug('Sending batch of users to elba: ', {
        organisationId,
        users,
      });
      await elba.users.update({ users });

      if (result.pagination.nextPage) {
        return result.pagination.nextPage;
      }
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'auth0/users.page_sync.requested',
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
