import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { refreshSubscription as refreshOnedriveSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { decrypt } from '@/common/crypto';

export const refreshSubscription = inngest.createFunction(
  {
    id: 'onedrive-refresh-subscription',
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
  { event: 'onedrive/subscriptions.refresh.triggered' },
  async ({ event }) => {
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
    const subscription = await refreshOnedriveSubscription({ token, subscriptionId });

    await db
      .update(subscriptionsTable)
      .set({
        subscriptionExpirationDate: subscription.expirationDateTime,
      })
      .where(
        and(
          eq(subscriptionsTable.organisationId, organisationId),
          eq(subscriptionsTable.subscriptionId, subscriptionId)
        )
      );
  }
);
