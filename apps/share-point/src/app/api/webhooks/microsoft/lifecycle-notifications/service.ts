import { inArray } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import type { SubscriptionRefresh } from './type';

export const handleSubscriptionEvent = async (
  data: { tenantId: string; subscriptionId: string }[]
) => {
  if (!data.length) {
    return;
  }

  const tenantIds = data.map((subscriptionEvent) => subscriptionEvent.tenantId);

  const organisations = await db
    .select({
      organisationId: organisationsTable.id,
      tenantId: organisationsTable.tenantId,
    })
    .from(organisationsTable)
    .where(inArray(organisationsTable.tenantId, tenantIds));

  const subscriptionEvents = data.reduce<SubscriptionRefresh[]>((acc, subscription) => {
    const currentOrganisation = organisations.find(
      (organisation) => organisation.tenantId === subscription.tenantId
    );
    if (currentOrganisation) {
      acc.push({
        organisationId: currentOrganisation.organisationId,
        subscriptionId: subscription.subscriptionId,
      });
    }
    return acc;
  }, []);

  await inngest.send(
    subscriptionEvents.map((subscribe) => ({
      id: `subscribe-event-${subscribe.subscriptionId}`,
      name: 'share-point/subscription.refresh.triggered',
      data: subscribe,
    }))
  );
};
