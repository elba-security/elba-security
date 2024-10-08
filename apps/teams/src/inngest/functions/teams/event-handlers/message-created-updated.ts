import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { decrypt } from '@/common/crypto';
import { getMessage } from '@/connectors/microsoft/messages/messages';
import { getTeam } from '@/connectors/microsoft/teams/teams';
import { omitMessageContent } from '@/common/utils';

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

  const messageWithoutContent = await step.run('fetch-message-from-microsoft', async () => {
    const message = await getMessage({
      token: decryptedToken,
      teamId,
      channelId,
      messageId,
    });
    return message ? omitMessageContent(message) : message;
  });

  if (!messageWithoutContent || messageWithoutContent.messageType !== 'message') {
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
        messageId,
        message: messageWithoutContent,
      },
    }))
  );
};
