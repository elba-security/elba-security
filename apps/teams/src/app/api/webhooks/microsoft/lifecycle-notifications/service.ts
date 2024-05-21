import { inArray } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import type { MicrosoftLifecycleHandlerPayload } from '@/app/api/webhooks/microsoft/lifecycle-notifications/types';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';

export const handleSubscriptionEvent = async (
  events: MicrosoftLifecycleHandlerPayload['value']
) => {
  if (!events.length) {
    return;
  }

  const reauthorizeEvents = events.filter(
    ({ lifecycleEvent }) => lifecycleEvent === 'reauthorizationRequired'
  );

  const tenantIds = reauthorizeEvents.map((event) => event.organizationId);

  const organisations = await db
    .select({
      organisationId: organisationsTable.id,
      tenantId: organisationsTable.tenantId,
    })
    .from(organisationsTable)
    .where(inArray(organisationsTable.tenantId, tenantIds));

  const subscriptionToRefresh = reauthorizeEvents.reduce((acc, event) => {
    const organisation = organisations.find((org) => org.tenantId === event.organizationId);

    if (organisation?.tenantId) {
      return [...acc, { ...event, organisationId: organisation.organisationId }];
    }
    return acc;
  }, []);

  await inngest.send(
    subscriptionToRefresh.map(({ subscriptionId, organisationId }) => ({
      name: 'teams/subscription.refresh.requested',
      data: {
        organisationId,
        subscriptionId,
      },
    }))
  );
};
