import { channelCreatedHandler } from '@/inngest/functions/teams/event-handlers/channel-create';
import type { TeamsWebhookHandlerContext } from '@/inngest/functions/teams/handle-team-webhook-event';
import { channelDeleteHandler } from '@/inngest/functions/teams/event-handlers/channel-delete';
import { messageCreatedHandler } from '@/inngest/functions/teams/event-handlers/message-create';
import { replyCreatedHandler } from '@/inngest/functions/teams/event-handlers/reply-create';
import { EventType} from '@/app/api/webhook/types';
import type { WebhookPayload } from '@/app/api/webhook/types';

export type TeamsEventHandler = (
  event: WebhookPayload,
  context: TeamsWebhookHandlerContext
) => Promise<unknown>;

const teamsEventHandlers: Record<EventType, TeamsEventHandler> = {
  [EventType.ChannelCreated]: channelCreatedHandler,
  [EventType.ChannelDeleted]: channelDeleteHandler,
  [EventType.MessageCreated]: messageCreatedHandler,
  [EventType.ReplyCreated]: replyCreatedHandler,
};
export const teamsEventHandler = async (context: TeamsWebhookHandlerContext) => {
  const payload = context.event.data.payload;
  const type = payload.event as EventType;
  const eventHandler = teamsEventHandlers[type];

  return eventHandler(payload, context);
};
