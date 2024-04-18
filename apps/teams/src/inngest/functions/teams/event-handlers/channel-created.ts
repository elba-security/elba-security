import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { decrypt } from '@/common/crypto';
import { inngest } from '@/inngest/client';
import { getChannel } from '@/connectors/microsoft/channels/channels';

export const channelCreatedHandler: TeamsEventHandler = async ({ channelId, teamId, tenantId }) => {
  const [organisation] = await db
    .select({
      id: organisationsTable.id,
      token: organisationsTable.token,
    })
    .from(organisationsTable)
    .where(eq(organisationsTable.tenantId, tenantId));

  if (!organisation) {
    throw new NonRetriableError(`Could not retrieve organisation with tenant=${tenantId}`);
  }

  const [channelInDb] = await db
    .select({
      id: channelsTable.id,
    })
    .from(channelsTable)
    .where(eq(channelsTable.id, `${organisation.id}:${channelId}`));

  if (channelInDb) {
    return { message: 'channel already exists' };
  }

  const channel = await getChannel({
    token: await decrypt(organisation.token),
    teamId,
    channelId,
  });

  if (!channel || channel.membershipType === 'private') {
    return { message: 'Ignore private or invalid channel' };
  }

  await db
    .insert(channelsTable)
    .values({
      id: `${organisation.id}:${channelId}`,
      organisationId: organisation.id,
      membershipType: channel.membershipType,
      displayName: channel.displayName,
      channelId,
    })
    .onConflictDoNothing();

  await inngest.send({
    name: 'teams/channel.subscription.requested',
    data: {
      uniqueChannelInOrganisationId: `${organisation.id}:${channel.id}`,
      organisationId: organisation.id,
      channelId: channel.id,
      teamId,
    },
  });

  return { message: 'Channel created' };
};
