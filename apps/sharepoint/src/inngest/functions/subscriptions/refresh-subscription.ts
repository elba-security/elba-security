import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { refreshSubscription as refreshSharepointSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { decrypt } from '@/common/crypto';

export const refreshSubscription = inngest.createFunction(
  {
    id: 'sharepoint-refresh-subscription',
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
  { event: 'sharepoint/subscriptions.refresh.triggered' },
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
    const subscription = await refreshSharepointSubscription({ token, subscriptionId });

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
