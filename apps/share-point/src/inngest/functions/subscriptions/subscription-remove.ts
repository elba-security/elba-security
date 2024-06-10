import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, sharePointTable } from '@/database/schema';
import { removeSubscription } from '@/connectors/microsoft/subscription/subscriptions';

export const subscriptionRemove = inngest.createFunction(
  {
    id: 'share-point-subscribe-remove',
    cancelOn: [
      {
        event: 'share-point/app.uninstalled',
        match: 'data.organisationId',
      },
      {
        event: 'share-point/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
  },
  { event: 'share-point/subscription.remove.triggered' },
  async ({ event, step }) => {
    const { subscriptionId, organisationId } = event.data;

    const [record] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(sharePointTable)
      .innerJoin(organisationsTable, eq(sharePointTable.organisationId, organisationsTable.id))
      .where(
        and(
          eq(sharePointTable.organisationId, organisationId),
          eq(sharePointTable.subscriptionId, subscriptionId)
        )
      );

    if (!record) {
      throw new NonRetriableError(
        `Could not retrieve organisation with organisationId=${organisationId} and subscriptionId=${subscriptionId}`
      );
    }

    await removeSubscription(record.token, subscriptionId);

    await step.sendEvent('remove-subscription-completed', {
      name: 'share-point/subscription.remove.completed',
      data: {
        subscriptionId,
        organisationId,
      },
    });
  }
);
