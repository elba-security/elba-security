import { eq, inArray } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { db } from '@/database/client';
import {
  deleteSubscription,
  getSubscriptions,
} from '@/connectors/microsoft/subscriptions/subscriptions';

export const removeSubscriptions = inngest.createFunction(
  {
    id: 'teams-remove-subscriptions',
  },
  { event: 'teams/subscriptions.remove.requested' },
  async ({ event, step }) => {
    const { tenantId, skipToken } = event.data;

    const [organisation] = await db
      .select({ token: organisationsTable.token })
      .from(organisationsTable)
      .where(eq(organisationsTable.tenantId, tenantId));

    if (!organisation) {
      throw new NonRetriableError(`Could not find any organisation with tenant - ${tenantId}`);
    }

    const { subscriptions, nextSkipToken } = await step.run(
      'fetch-subscriptions-from-microsoft',
      async () => getSubscriptions(organisation.token, skipToken)
    );

    await step.run('delete-subscriptions-from-microsoft', async () => {
      await Promise.all(
        subscriptions.map((subscription) => deleteSubscription(organisation.token, subscription.id))
      );
    });

    await step.run('delete-subscriptions-from-database', async () => {
      const { rowCount } = await db.delete(subscriptionsTable).where(
        inArray(
          subscriptionsTable.id,
          subscriptions.map(({ id }) => id)
        )
      );
      return rowCount;
    });

    if (nextSkipToken) {
      await step.sendEvent('teams-remove-subscriptions-next-page', {
        name: 'teams/subscriptions.remove.requested',
        data: {
          tenantId,
          skipToken: nextSkipToken,
        },
      });

      return 'Subscriptions successfully deleted on this page, starting processing new page';
    }

    return 'Subscriptions successfully deleted for tenant';
  }
);
