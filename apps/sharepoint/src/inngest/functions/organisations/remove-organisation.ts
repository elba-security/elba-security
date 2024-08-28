import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { createElbaClient } from '@/connectors/elba/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'sharepoint-remove-organisation',
    retries: 5,
  },
  {
    event: 'sharepoint/app.uninstalled',
  },
  async ({ event, step }) => {
    const { organisationId } = event.data;
    const [organisation] = await db
      .select({
        region: organisationsTable.region,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    if (!organisation) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisation}`);
    }

    const subscriptions = await db
      .select({
        subscriptionId: subscriptionsTable.subscriptionId,
      })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.organisationId, organisationId));

    if (subscriptions.length) {
      const eventsWait = subscriptions.map(({ subscriptionId }) =>
        step.waitForEvent(`wait-for-remove-subscription-complete-${subscriptionId}`, {
          event: 'sharepoint/subscriptions.remove.completed',
          timeout: '30d',
          if: `async.data.organisationId == '${organisationId}' && async.data.subscriptionId == '${subscriptionId}'`,
        })
      );

      await step.sendEvent(
        'subscription-remove-triggered',
        subscriptions.map(({ subscriptionId }) => ({
          name: 'sharepoint/subscriptions.remove.triggered',
          data: {
            organisationId,
            subscriptionId,
          },
        }))
      );

      await Promise.all(eventsWait);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
