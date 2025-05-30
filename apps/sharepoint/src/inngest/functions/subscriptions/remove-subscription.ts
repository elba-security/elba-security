import { and, eq, inArray } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { removeSubscription as removeSharepointSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { decrypt } from '@/common/crypto';
import { env } from '@/common/env';

export const removeSubscription = inngest.createFunction(
  {
    id: 'sharepoint-remove-subscription',
    cancelOn: [
      {
        event: 'sharepoint/app.installed',
        match: 'data.organisationId',
      },
    ],
    retries: 5,
    onFailure: async ({ event, step }) => {
      const { organisationId } = event.data.event.data;

      await step.sendEvent('subscription-removal-failed', {
        name: 'sharepoint/subscriptions.remove.completed',
        data: { organisationId },
      });
    },
  },
  { event: 'sharepoint/subscriptions.remove.triggered' },
  async ({ event, step }) => {
    const { organisationId } = event.data;

    const subscriptionIds = await step.run('get-organisation-subscriptions', async () => {
      const subscriptions = await db
        .select({
          subscriptionId: subscriptionsTable.subscriptionId,
        })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.organisationId, organisationId))
        .orderBy(subscriptionsTable.subscriptionId)
        .limit(env.SUBSCRIPTION_REMOVAL_BATCH_SIZE);

      return subscriptions.map(({ subscriptionId }) => subscriptionId);
    });

    if (subscriptionIds.length) {
      const [organisation] = await db
        .select({ token: organisationsTable.token })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      const token = await decrypt(organisation.token);
      await Promise.all(
        subscriptionIds.map((subscriptionId) =>
          step.run(`remove-subscription-${subscriptionId}`, () =>
            removeSharepointSubscription({ token, subscriptionId })
          )
        )
      );

      await db
        .delete(subscriptionsTable)
        .where(
          and(
            eq(subscriptionsTable.organisationId, organisationId),
            inArray(subscriptionsTable.subscriptionId, subscriptionIds)
          )
        );

      await step.sendEvent('remove-organisation-subscriptions', {
        name: 'sharepoint/subscriptions.remove.triggered',
        data: { organisationId },
      });

      return { status: 'ongoing' };
    }

    await step.sendEvent('remove-subscription-completed', {
      name: 'sharepoint/subscriptions.remove.completed',
      data: { organisationId },
    });

    return { status: 'completed' };
  }
);
