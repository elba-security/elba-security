import { inArray } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import type { MicrosoftSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const handleSubscriptionEvent = async (
  subscriptionsEvents: MicrosoftSubscriptionEvent[]
) => {
  if (!subscriptionsEvents.length) {
    return;
  }

  const tenantIds = subscriptionsEvents.map((tenant) => tenant.organisationId);

  const organisations = await db
    .select({
      organisationId: organisationsTable.id,
      tenantId: organisationsTable.tenantId,
    })
    .from(organisationsTable)
    .where(inArray(organisationsTable.tenantId, tenantIds));

  const subscriptionEvents = subscriptionsEvents.map((subscription) => {
    const currentOrganisation = organisations.find(
      (organisation) => organisation.tenantId === subscription.organisationId
    );
    if (currentOrganisation?.tenantId) {
      return { ...subscription, organisationId: currentOrganisation.organisationId };
    }
    return subscription;
  });

  await inngest.send(
    subscriptionEvents.map(({ subscriptionId, organisationId }) => ({
      id: `subscribe-event-${subscriptionId}`,
      name: 'teams/subscription.refresh.triggered',
      data: {
        organisationId,
        subscriptionId,
      },
    }))
  );
};
