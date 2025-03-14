import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { deleteSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';

export const removeSubscription = inngest.createFunction(
  {
    id: 'teams-remove-subscription',
    cancelOn: [
      {
        event: 'teams/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
    onFailure: async ({ event, step }) => {
      const { organisationId, subscriptionId } = event.data.event.data;

      await step.sendEvent('subscription-removal-failed', {
        name: 'teams/subscriptions.remove.completed',
        data: { organisationId, subscriptionId },
      });
    },
  },
  { event: 'teams/subscriptions.remove.triggered' },
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
          eq(subscriptionsTable.id, subscriptionId)
        )
      );

    if (!record) {
      throw new NonRetriableError(
        `Could not retrieve organisation with organisationId=${organisationId} and subscriptionId=${subscriptionId}`
      );
    }

    await deleteSubscription(record.token, subscriptionId);

    await step.sendEvent('remove-subscription-completed', {
      name: 'teams/subscriptions.remove.completed',
      data: {
        subscriptionId,
        organisationId,
      },
    });
  }
);
