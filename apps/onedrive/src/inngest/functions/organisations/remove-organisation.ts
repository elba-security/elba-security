import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { createElbaClient } from '@/connectors/elba/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema'; // oneDriveTable
import { inngest } from '@/inngest/client';

export const removeOrganisation = inngest.createFunction(
  {
    id: 'onedrive-remove-organisation',
    retries: 5,
  },
  {
    event: 'onedrive/app.uninstalled',
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
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const subscriptions = await db
      .select({
        subscriptionId: subscriptionsTable.subscriptionId,
      })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.organisationId, organisationId));

    if (subscriptions.length) {
      await Promise.all([
        ...subscriptions.map(({ subscriptionId }) =>
          step.waitForEvent(`wait-for-remove-subscription-complete-${subscriptionId}`, {
            event: 'onedrive/subscriptions.remove.completed',
            timeout: '30d',
            if: `async.data.organisationId == '${organisationId}' && async.data.subscriptionId == '${subscriptionId}'`,
          })
        ),
        step.sendEvent(
          'subscription-remove-triggered',
          subscriptions.map(({ subscriptionId }) => ({
            name: 'onedrive/subscriptions.remove.triggered',
            data: {
              organisationId,
              subscriptionId,
            },
          }))
        ),
      ]);
    }

    const elba = createElbaClient({ organisationId, region: organisation.region });

    await elba.connectionStatus.update({ hasError: true });

    await db.delete(organisationsTable).where(eq(organisationsTable.id, organisationId));
  }
);
