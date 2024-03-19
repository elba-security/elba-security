import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { logger } from '@elba-security/logger';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { type DocusignUser } from '@/connectors/users';

const formatElbaUser = (user: DocusignUser): User => ({
  id: user.userId,
  displayName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' '),
  role: user.isAdmin ? 'admin' : 'user',
  email: user.email,
  additionalEmails: [],
});

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : -600',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'docusign/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const { token, region, apiBaseURI, accountID } = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({
          token: Organisation.accessToken,
          region: Organisation.region,
          accountID: Organisation.accountId,
          apiBaseURI: Organisation.apiBaseURI,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return {
        token: organisation.token,
        region: organisation.region,
        accountID: organisation.accountID,
        apiBaseURI: organisation.apiBaseURI,
      };
    });

    const elba = new Elba({
      organisationId,
      // sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers({ token, accountID, apiBaseURI, start: page });

      const users = result.validUsers
        .filter(({ userStatus }) => userStatus === 'Active')
        .map(formatElbaUser);
      console.log('users', users);

      if (result.invalidUsers.length > 0) {
        logger.warn('Retrieved users contains invalid data', {
          organisationId,
          invalidUsers: result.invalidUsers,
        });
      }
      await elba.users.update({ users });

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'docusign/users.sync.requested',
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
