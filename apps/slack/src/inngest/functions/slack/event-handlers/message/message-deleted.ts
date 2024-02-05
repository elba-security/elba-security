import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { createElbaClient } from '@/connectors/elba/client';
import { formatDataProtectionObjectId } from '@/connectors/elba/data-protection/objects';
import type { SlackMessageHandler } from './types';

export const messageDeletedHandler: SlackMessageHandler<'message_deleted'> = async (event) => {
  const teamId = event.team_id;
  const team = await db.query.teamsTable.findFirst({
    where: eq(teamsTable.id, teamId),
    columns: {
      elbaOrganisationId: true,
      elbaRegion: true,
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const { deleted_ts: messageId, channel: conversationId } = event.event;
  const objectId = formatDataProtectionObjectId({ teamId, conversationId, messageId });
  const elbaClient = createElbaClient(team.elbaOrganisationId, team.elbaRegion);

  await elbaClient.dataProtection.deleteObjects({ ids: [objectId] });

  return {
    message: 'Message deleted',
    teamId,
    conversationId,
    messageId,
  };
};
