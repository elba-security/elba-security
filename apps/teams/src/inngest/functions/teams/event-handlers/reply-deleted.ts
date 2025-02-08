import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';

export const replyDeletedHandler: TeamsEventHandler = async (
  { replyId, messageId, organisations },
  { step }
) => {
  if (!messageId || !replyId) {
    return;
  }

  await step.sendEvent(
    'request-reply-delete',
    organisations.map(({ id, region }) => ({
      name: 'teams/data.protection.object.delete.requested',
      data: {
        organisationId: id,
        region,
        messageId: replyId,
      },
    }))
  );
};
