import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { createElbaClient } from '@/connectors/elba/client';
import { organisationsTable, sharePointTable } from '@/database/schema';
import { inngest } from '@/inngest/client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'sharepoint-remove-organisation',
    priority: {
      run: '600',
    },
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
        subscriptionId: sharePointTable.subscriptionId,
      })
      .from(sharePointTable)
      .where(eq(sharePointTable.organisationId, organisationId));

    if (subscriptions.length) {
      const eventsWait = subscriptions.map(({ subscriptionId }) =>
        step.waitForEvent(`wait-for-remove-subscription-complete-${subscriptionId}`, {
          event: 'sharepoint/subscription.remove.completed',
          timeout: '1d',
          if: `async.data.organisationId == '${organisationId}' && async.data.subscriptionId == '${subscriptionId}'`,
        })
      );

      await step.sendEvent(
        'subscription-remove-triggered',
        subscriptions.map(({ subscriptionId }) => ({
          name: 'sharepoint/subscription.remove.triggered',
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

    await db.delete(sharePointTable).where(eq(sharePointTable.organisationId, organisationId));
    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
