import { and, eq, or } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable, sharePointTable } from '../database/schema';

export const getSubscriptionsFromDB = async (
  subscriptions: { tenantId: string; subscriptionId: string }[]
) => {
  const conditions = subscriptions.map((sub) =>
    and(
      eq(organisationsTable.tenantId, sub.tenantId),
      eq(sharePointTable.subscriptionId, sub.subscriptionId)
    )
  );

  return db
    .select({
      tenantId: organisationsTable.tenantId,
      subscriptionClientState: sharePointTable.subscriptionClientState,
      subscriptionId: sharePointTable.subscriptionId,
    })
    .from(sharePointTable)
    .innerJoin(organisationsTable, eq(sharePointTable.organisationId, organisationsTable.id))
    .where(or(...conditions));
};
