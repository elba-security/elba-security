/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/users';
import { type WebflowUser } from '@/connectors/types';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: WebflowUser): User => ({
  id: user.id,
  displayName: user.data.name,
  email: user.data.email,
  role: 'member',
  authMethod: undefined,
  additionalEmails: [],
});

export const syncUsersPage = inngest.createFunction(
  {
    id: 'webflow-sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 5,
    cancelOn: [
      {
        event: 'webflow/app.uninstall.requested',
        match: 'data.organisationId',
      },
    ],
  },
  { event: 'webflow/users.page_sync.requested' },
  async ({ event, step, logger }) => {
    const { organisationId, syncStartedAt, region, page } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the Webflow Organisation
    const organisation = await step.run('get-organisation', async () => {
      const [result] = await db
        .select({
          accessToken: Organisation.accessToken,
          siteIds: Organisation.siteIds,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));
      if (!result) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return result;
    });

    let allUsers: User[] = [];

    for (const siteId of organisation.siteIds) {
      let nextPage: number | null = page;

      while (nextPage !== null) {
        nextPage = await step.run('list-users', async () => {
          const result = await getUsers(organisation.accessToken, siteId, Number(nextPage));
          const users = result.users.map(formatElbaUser);
      
          allUsers = allUsers.concat(users);
          
          logger.debug('Sending batch of users to elba: ', {
            organisationId,
            users,
          });
          
          await elba.users.update({ users });

          if (result.pagination.next) {
            return result.pagination.next;
          }
          return null;
        });

        // if there is a next page enqueue a new sync user event
        if (nextPage) {
          await step.sendEvent('sync-users-page', {
            name: 'webflow/users.page_sync.requested',
            data: {
              ...event.data,
              page: nextPage,
            },
          });
          return {
            status: 'ongoing',
          };
        }
      }
    }

    await elba.users.update({ users: allUsers });

    // delete the elba users that have been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
