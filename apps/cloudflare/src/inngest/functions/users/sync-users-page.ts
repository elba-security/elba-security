import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type CloudflareUser, getUsers } from '@/connectors/users';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: CloudflareUser): User => ({
  id: user.id,
  displayName: `${user.user.first_name} ${user.user.last_name}`,
  email: user.user.email,
  additionalEmails: [],
});

/**
 * DISCLAIMER:
 * This function, `syncUsersPage`, is provided as an illustrative example and is not a working implementation.
 * It is intended to demonstrate a conceptual approach for syncing users in a SaaS integration context.
 * Developers should note that each SaaS integration may require a unique implementation, tailored to its specific requirements and API interactions.
 * This example should not be used as-is in production environments and should not be taken for granted as a one-size-fits-all solution.
 * It's essential to adapt and modify this logic to fit the specific needs and constraints of the SaaS platform you are integrating with.
 */
export const syncUsersPage = inngest.createFunction(
  {
    id: 'sync-users-page',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'cloudflare/users.page_sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, region, page } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the SaaS organisation token
    const keys = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({ authEmail: Organisation.authEmail, authKey: Organisation.authKey })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return { authEmail: organisation.authEmail, authKey: organisation.authKey };
    });

    const nextPage = await step.run('list-users', async () => {
      const { authEmail, authKey } = keys;
      const dcrAuthKey = await decrypt(authKey);

      // retrieve this users page
      const result = await getUsers(dcrAuthKey, authEmail, page);
      // format each SaaS users to elba users
      const users = result.users.map(formatElbaUser);
      // send the batch of users to elba
      await elba.users.update({ users });

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('sync-users-page', {
        name: 'cloudflare/users.page_sync.requested',
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
