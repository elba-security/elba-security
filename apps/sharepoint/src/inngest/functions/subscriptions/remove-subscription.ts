import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { removeSubscription as removeSharepointSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { decrypt } from '@/common/crypto';

export const removeSubscription = inngest.createFunction(
  {
    id: 'sharepoint-remove-subscription',
    cancelOn: [
      {
        event: 'sharepoint/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'sharepoint/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'sharepoint/subscriptions.remove.triggered' },
  async ({ event, step }) => {
    const { subscriptionId, organisationId } = event.data;

    const [record] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(subscriptionsTable)
      .innerJoin(organisationsTable, eq(subscriptionsTable.organisationId, organisationsTable.id))
      .where(
        and(
          eq(subscriptionsTable.organisationId, organisationId),
          eq(subscriptionsTable.subscriptionId, subscriptionId)
        )
      );

    if (!record) {
      throw new NonRetriableError(
        `Could not retrieve organisation with organisationId=${organisationId} and subscriptionId=${subscriptionId}`
      );
    }

    const token = await decrypt(record.token);
    await removeSharepointSubscription({ token, subscriptionId });

    await step.sendEvent('remove-subscription-completed', {
      name: 'sharepoint/subscriptions.remove.completed',
      data: {
        subscriptionId,
        organisationId,
      },
    });
  }
);
