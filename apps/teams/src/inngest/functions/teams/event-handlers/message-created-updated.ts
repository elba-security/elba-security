import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { decrypt } from '@/common/crypto';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObject } from '@/connectors/elba/data-protection/object';
import { getMessage } from '@/connectors/microsoft/messages/messages';
import { getTeam } from '@/connectors/microsoft/teams/teams';

export const messageCreatedOrUpdatedHandler: TeamsEventHandler = async ({
  channelId,
  messageId,
  teamId,
  tenantId,
}) => {
  if (!messageId) {
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
      `Could not retrieve channel with id=${organisation.id}:${channelId}`
    );
  }

  const team = await getTeam(organisation.token, teamId);

  if (!team) {
    return;
  }

  const message = await getMessage({
    token: await decrypt(organisation.token),
    teamId,
    channelId,
    messageId,
  });

  if (!message || message.messageType !== 'message') {
    return;
  }

  const elbaClient = createElbaClient(organisation.id, organisation.region);

  const object = formatDataProtectionObject({
    teamId,
    teamName: team.displayName,
    messageId: message.id,
    channelId,
    channelName: channel.displayName,
    organisationId: organisation.id,
    membershipType: channel.membershipType,
    message,
  });

  await elbaClient.dataProtection.updateObjects({ objects: [object] });
};
