import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getTrelloUsersIds, getTrelloMembers, updateElba } from '@/app/auth/service';

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
  { event: 'trello/users/sync_page.triggered' },
  async ({ event, step }) => {
    const token = await step.run('get-token', async () => {
      try {
        const [organisation] = await db
          .select({ token: Organisation.token })
          .from(Organisation)
          .where(eq(Organisation.id, event.data.organisationId));
        if (!organisation) {
          throw new NonRetriableError(
            `Could not retrieve organisation with id=${event.data.organisationId}`
          );
        }
        return organisation.token;
      } catch (error) {
        throw new NonRetriableError(
          `Error retrieving token for organisation with id=${event.data.organisationId}`
        );
      }
    });
    await step.run('list-users', async () => {
      const membersID = await getTrelloUsersIds({
        organisationId: event.data.organisationId,
        token,
      });
      const trelloMembers = await getTrelloMembers({ membersID, token });
      if (!trelloMembers.length) {
        await updateElba(trelloMembers, event.data.organisationId);
      }
    });
    return {
      status: 'completed',
    };
  }
);
