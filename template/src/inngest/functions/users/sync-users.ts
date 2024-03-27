import { Elba } from '@elba-security/sdk';
import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/common/crypto';
import { getUsers } from '@/connectors/x-saas/users';
import { formatElbaUser } from '@/connectors/elba/users';

/**
 * DISCLAIMER:
 * This function, `syncUsers`, is provided as an illustrative example and is not a working implementation.
 * It is intended to demonstrate a conceptual approach for syncing users in a SaaS integration context.
 * Developers should note that each SaaS integration may require a unique implementation, tailored to its specific requirements and API interactions.
 * This example should not be used as-is in production environments and should not be taken for granted as a one-size-fits-all solution.
 * It's essential to adapt and modify this logic to fit the specific needs and constraints of the SaaS platform you are integrating with.
 */
export const syncUsers = inngest.createFunction(
  {
    id: 'x-saas-sync-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    cancelOn: [
      {
        event: 'x-saas/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'x-saas/app.installed',
        match: 'data.organisationId',
      },
    ],
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'x-saas/users.sync.requested' },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    // retrieve the organisation
    const organisation = await step.run('get-organisation', async () => {
      const [row] = await db
        .select()
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!row) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      return row;
    });

    const elba = new Elba({
      organisationId,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      region: organisation.region,
    });

    const nextPage = await step.run('list-users', async () => {
      // retrieve this users page
      const result = await getUsers(await decrypt(organisation.accessToken), page);
      // format each SaaS users to elba users
      const users = result.users.map(formatElbaUser);
      // send the batch of users to elba
      await elba.users.update({ users });

      return result.nextPage;
    });

    // if there is a next page enqueue a new sync user event
    if (nextPage) {
      await step.sendEvent('request-next-users-page-sync', {
        name: 'x-saas/users.sync.requested',
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
