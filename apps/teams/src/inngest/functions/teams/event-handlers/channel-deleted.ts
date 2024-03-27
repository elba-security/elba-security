import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { db } from '@/database/client';
import { channelsTable, organisationsTable, subscriptionsTable } from '@/database/schema';
import { deleteSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';
import { createElbaClient } from '@/connectors/elba/client';

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
      messages: channelsTable.messages,
    })
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId));

  if (!channel) {
    throw new NonRetriableError(`Could not retrieve channel with channelId=${channelId}`);
  }

  await db.delete(subscriptionsTable).where(eq(subscriptionsTable.id, subscriptionId));

  await db.delete(channelsTable).where(eq(channelsTable.id, channelId));

  await deleteSubscription(organisation.token, subscriptionId);

  if (channel.messages?.length) {
    const elbaClient = createElbaClient(organisation.id, organisation.region);

    await elbaClient.dataProtection.deleteObjects({ ids: channel.messages });
  }

  return { message: 'channel was deleted' };
};
