import type { User } from '@elba-security/sdk';
import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { type DatadogUser, getUsers } from '@/connectors/users';
import { env } from '@/env';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { decrypt } from '@/common/crypto';

const formatElbaUser = (user: DatadogUser): User => ({
  id: user.id,
  displayName: user.attributes.name,
  email: user.attributes.email,
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
      limit: 100,
    },
    retries: 1,
  },
  { event: 'datadog/users.page_sync.requested' },
  async ({ event, step }) => {
    const { syncStartedAt, region, organisationId } = event.data;

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region,
    });

    // retrieve the SaaS organisation token
    const keys = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({ apiKey: Organisation.apiKey, appKey: Organisation.appKey })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }
      return { apiKey: organisation.apiKey, appKey: organisation.appKey };
    });

    await step.run('list-users', async () => {
      const { apiKey, appKey } = keys;

      const dcrApiKey = await decrypt(apiKey);
      const dcrAppKey = await decrypt(appKey);

      // retrieve this users page
      const result = await getUsers(dcrAppKey, dcrApiKey);
      // format each SaaS users to elba users
      const users = result.map(formatElbaUser);
      // send the batch of users to elba
      await elba.users.update({ users });
    });

    // delete the elba users that has been sent before this sync
    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: new Date(syncStartedAt).toISOString() })
    );

    return {
      status: 'completed',
    };
  }
);
