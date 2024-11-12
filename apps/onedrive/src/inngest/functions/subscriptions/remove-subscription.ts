import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { removeSubscription as removeOnedriveSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { decrypt } from '@/common/crypto';

export const removeSubscription = inngest.createFunction(
  {
    id: 'onedrive-remove-subscription',
    cancelOn: [
      {
        event: 'onedrive/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'onedrive/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'onedrive/subscriptions.remove.triggered' },
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
    await removeOnedriveSubscription({ token, subscriptionId });

    await step.sendEvent('remove-subscription-completed', {
      name: 'onedrive/subscriptions.remove.completed',
      data: {
        subscriptionId,
        organisationId,
      },
    });
  }
);
