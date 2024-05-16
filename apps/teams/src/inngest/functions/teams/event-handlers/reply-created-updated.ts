import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';
import { getReply } from '@/connectors/microsoft/replies/replies';
import { getTeam } from '@/connectors/microsoft/teams/teams';

export const replyCreatedOrUpdatedHandler: TeamsEventHandler = async ({
  channelId,
  replyId,
  teamId,
  messageId,
  tenantId,
}) => {
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

  const [channel] = await db
    .select({
      id: channelsTable.id,
      displayName: channelsTable.displayName,
      membershipType: channelsTable.membershipType,
    })
    .from(channelsTable)
    .where(eq(channelsTable.id, `${organisation.id}:${channelId}`));

  if (!channel) {
    throw new NonRetriableError(
      `Could not retrieve channel with channelId=${organisation.id}:${channelId}`
    );
  }

  const team = await getTeam(organisation.token, teamId);

  if (!team) {
    return;
  }

  const reply = await getReply({
    token: await decrypt(organisation.token),
    teamId,
    channelId,
    messageId,
    replyId,
  });

  if (!reply || reply.messageType !== 'message') {
    return;
  }

  const elbaClient = createElbaClient(organisation.id, organisation.region);

  const object = formatDataProtectionObject({
    teamId,
    teamName: team.displayName,
    channelId,
    messageId,
    replyId: reply.id,
    channelName: channel.displayName,
    organisationId: organisation.id,
    membershipType: channel.membershipType,
    message: reply,
  });

  await elbaClient.dataProtection.updateObjects({ objects: [object] });
};
