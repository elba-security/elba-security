import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { db } from '@/database/client';
import { channelsTable, organisationsTable, subscriptionsTable } from '@/database/schema';
import { deleteSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { inngest } from '@/inngest/client';

export const channelDeletedHandler: TeamsEventHandler = async ({
  channelId,
  tenantId,
  subscriptionId,
}) => {
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

  const [channel] = await db
    .select({
      id: channelsTable.id,
    })
    .from(channelsTable)
    .where(eq(channelsTable.id, `${organisation.id}:${channelId}`));

  if (!channel) {
    throw new NonRetriableError(`Could not retrieve channel with channelId=${channelId}`);
  }

  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, subscriptionId));

  await db.delete(channelsTable).where(eq(channelsTable.id, `${organisation.id}:${channelId}`));

  await deleteSubscription(organisation.token, subscriptionId);

  await inngest.send({
    name: 'teams/teams.sync.requested',
    data: {
      organisationId: organisation.id,
      syncStartedAt: new Date().toISOString(),
      skipToken: null,
      isFirstSync: true,
    },
  });

  return { message: 'channel was deleted' };
};
