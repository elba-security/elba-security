import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';
import { decrypt } from '@/common/crypto';
import { getReply } from '@/connectors/microsoft/replies/replies';
import { getTeam } from '@/connectors/microsoft/teams/teams';
import { omitMessageContent } from '@/common/utils';

export const replyCreatedOrUpdatedHandler: TeamsEventHandler = async (
  { channelId, replyId, teamId, messageId, organisations, token },
  { step }
) => {
  if (!messageId || !replyId) {
    return;
  }

  const decryptedToken = await decrypt(token);

  const team = await getTeam(decryptedToken, teamId);

  if (!team) {
    return 'Could not find a team';
  }

  const replyWithoutContent = await step.run('fetch-reply-from-microsoft', async () => {
    const reply = await getReply({
      token: decryptedToken,
      teamId,
      channelId,
      messageId,
      replyId,
    });
    return reply ? omitMessageContent(reply) : reply;
  });

  if (!replyWithoutContent || replyWithoutContent.messageType !== 'message') {
    return 'Ignoring invalid reply';
  }

  await step.sendEvent(
    'request-to-upsert-reply',
    organisations.map(({ id, region }) => ({
      name: 'teams/data.protection.object.upsert.requested',
      data: {
        organisationId: id,
        region,
        teamId,
        teamName: team.displayName,
        channelId,
        messageId,
        replyId: replyWithoutContent.id,
        message: replyWithoutContent,
      },
    }))
  );
};
