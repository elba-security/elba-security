import { inArray } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import type { MicrosoftSubscriptionEvent } from '@/app/api/webhooks/microsoft/lifecycle-notifications/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const handleSubscriptionEvent = async (data: MicrosoftSubscriptionEvent[]) => {
  if (!data.length) {
    return;
  }

  const tenantIds = data.map((tenant) => tenant.organizationId);

  const organisations = await db
    .select({
      organisationId: organisationsTable.id,
      tenantId: organisationsTable.tenantId,
    })
    .from(organisationsTable)
    .where(inArray(organisationsTable.tenantId, tenantIds));

  const subscriptionEvents = data.map((subscription) => {
    const currentOrganisation = organisations.find(
      (organisation) => organisation.tenantId === subscription.organizationId
    );
    if (subscription.organizationId === currentOrganisation?.tenantId) {
      subscription.organizationId = currentOrganisation.organisationId;
    }
    return subscription;
  });

  await inngest.send(
    subscriptionEvents.map((subscribe) => ({
      id: `subscribe-event-${subscribe.subscriptionId}`,
      name: 'teams/subscription.refresh.triggered',
      data: {
        organisationId: subscribe.organizationId,
        subscriptionId: subscribe.subscriptionId,
      },
    }))
  );
};
