import { and, eq, or } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable, subscriptionsTable } from '../database/schema';

export const getSubscriptionsFromDB = async (
  subscriptions: { tenantId: string; subscriptionId: string }[]
) => {
  const conditions = subscriptions.map((sub) =>
    and(
      eq(organisationsTable.tenantId, sub.tenantId),
      eq(subscriptionsTable.subscriptionId, sub.subscriptionId)
    )
  );

  return db
    .select({
      tenantId: organisationsTable.tenantId,
      subscriptionClientState: subscriptionsTable.subscriptionClientState,
      subscriptionId: subscriptionsTable.subscriptionId,
    })
    .from(subscriptionsTable)
    .innerJoin(organisationsTable, eq(subscriptionsTable.organisationId, organisationsTable.id))
    .where(or(...conditions));
};
