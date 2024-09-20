import { and, eq, or } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '@/database/schema';

export const getValidSubscriptions = async (
  webhookSubscriptions: { tenantId: string; subscriptionId: string; clientState: string }[]
) => {
  return db
    .select({
      organisationId: organisationsTable.id,
      tenantId: organisationsTable.tenantId,
      clientState: subscriptionsTable.subscriptionClientState,
      subscriptionId: subscriptionsTable.subscriptionId,
      userId: subscriptionsTable.userId,
    })
    .from(subscriptionsTable)
    .innerJoin(organisationsTable, eq(subscriptionsTable.organisationId, organisationsTable.id))
    .where(
      or(
        ...webhookSubscriptions.map((subscription) =>
          and(
            eq(organisationsTable.tenantId, subscription.tenantId),
            eq(subscriptionsTable.subscriptionId, subscription.subscriptionId),
            eq(subscriptionsTable.subscriptionClientState, subscription.clientState)
          )
        )
      )
    );
};

export type ValidSubscriptions = Awaited<ReturnType<typeof getValidSubscriptions>>;
