import { and, eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable, sharePointTable } from '@/database/schema';
import { refreshSubscription } from '@/connectors/microsoft/subscription/subscriptions';

export const subscriptionRefresh = inngest.createFunction(
  {
    id: 'sharepoint-subscribe-refresh',
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
  { event: 'sharepoint/subscription.refresh.triggered' },
  async ({ event }) => {
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

    const subscription = await refreshSubscription(record.token, subscriptionId);

    await db
      .update(sharePointTable)
      .set({
        subscriptionExpirationDate: subscription.expirationDateTime,
      })
      .where(
        and(
          eq(sharePointTable.organisationId, organisationId),
          eq(sharePointTable.subscriptionId, subscriptionId)
        )
      );
  }
);
