import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';

export const replyDeletedHandler: TeamsEventHandler = async ({ replyId, messageId, tenantId }) => {
  if (!messageId || !replyId) {
    return;
  }

  const [organisation] = await db
    .select({
      id: organisationsTable.id,
      token: organisationsTable.token,
      region: organisationsTable.region,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.tenantId, tenantId));

  if (!organisation) {
    throw new NonRetriableError(`Could not retrieve organisation with tenant=${tenantId}`);
  }

  const elbaClient = createElbaClient(organisation.id, organisation.region);

  await elbaClient.dataProtection.deleteObjects({ ids: [`${organisation.id}:${replyId}`] });
};
