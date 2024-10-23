import type { TeamsEventHandler } from '@/inngest/functions/teams/event-handlers/index';

export const messageDeletedHandler: TeamsEventHandler = async (
  { messageId, organisations },
  { step }
) => {
  if (!messageId) {
    return;
  }

  await step.sendEvent(
    'request-message-delete',
    organisations.map(({ id, region }) => ({
      name: 'teams/data.protection.object.delete.requested',
      data: {
        organisationId: id,
        region,
        messageId,
      },
    }))
  );
};
