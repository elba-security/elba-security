import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { getAccountDetails } from '@/connectors/account-info';

/**
 * DISCLAIMER:
 * This function, `synchronizeUsers`, is provided as an illustrative example and is not a working implementation.
 * It is intended to demonstrate a conceptual approach for syncing users in a SaaS integration context.
 * Developers should note that each SaaS integration may require a unique implementation, tailored to its specific requirements and API interactions.
 * This example should not be used as-is in production environments and should not be taken for granted as a one-size-fits-all solution.
 * It's essential to adapt and modify this logic to fit the specific needs and constraints of the SaaS platform you are integrating with.
 */
export const refreshTimeZone = inngest.createFunction(
  {
    id: 'refresh-timezone',
    concurrency: {
      key: 'event.data.organisationId',
      limit: 1,
    },
    retries: 3,
  },
  { event: 'hubspot/timezone.refresh.requested' },
  async ({ event, step }) => {
    const { organisationId } = event.data;

    // retrieve the SaaS organisation token
    const token = await step.run('get-timezone', async () => {
        const [organisation] = await db
          .select({ token: Organisation.accessToken })
          .from(Organisation)
          .where(eq(Organisation.id, organisationId));
        if (!organisation) {
          throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
        }
        return organisation.token;
      });

      
    const timeZone = await step.run('refresh-timezone', async () => {
        // retrieve this users timezone
        const result = await getAccountDetails(token);
        return result;
      });

    // update organisation accessToken & refreshToken
    await db
      .update(Organisation)
      .set({
        timeZone,
      })
      .where(eq(Organisation.id, organisationId));

  }
);
