import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { decrypt } from '@/common/crypto';
import { getMessage } from '@/connectors/microsoft/messages/messages';
import { getTeam } from '@/connectors/microsoft/teams/teams';

export const messageCreatedOrUpdatedHandler: TeamsEventHandler = async (
  { channelId, messageId, teamId, organisations, token },
  { step }
) => {
  if (!messageId) {
    return;
  }

  const decryptedToken = await decrypt(token);

  const team = await getTeam(decryptedToken, teamId);

  if (!team) {
    return 'Could not find a team';
  }

  const message = await step.run('fetch-message-from-microsoft', async () =>
    getMessage({
      token: decryptedToken,
      teamId,
      channelId,
      messageId,
    })
  );

  if (!message || message.messageType !== 'message') {
    return 'Ignoring invalid message';
  }

  await step.sendEvent(
    'request-to-upsert-message',
    organisations.map(({ id, region }) => ({
      name: 'teams/data.protection.object.upsert.requested',
      data: {
        organisationId: id,
        region,
        teamId,
        teamName: team.displayName,
        channelId,
        message,
      },
    }))
  );
};
