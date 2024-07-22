import { channelCreatedHandler } from '@/inngest/functions/teams/event-handlers/channel-created';
import type { TeamsWebhookHandlerContext } from '@/inngest/functions/teams/handle-team-webhook-event';
import { channelDeletedHandler } from '@/inngest/functions/teams/event-handlers/channel-deleted';
import type { WebhookPayload } from '@/app/api/webhooks/microsoft/event-handler/service';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { messageCreatedOrUpdatedHandler } from '@/inngest/functions/teams/event-handlers/message-created-updated';
import { replyCreatedOrUpdatedHandler } from '@/inngest/functions/teams/event-handlers/reply-created-updated';
import { messageDeletedHandler } from '@/inngest/functions/teams/event-handlers/message-deleted';
import { replyDeletedHandler } from '@/inngest/functions/teams/event-handlers/reply-deleted';

export type TeamsEventHandler = (
  event: WebhookPayload,
  context: TeamsWebhookHandlerContext
) => Promise<unknown>;

const teamsEventHandlers: Record<EventType, TeamsEventHandler> = {
  [EventType.ChannelCreated]: channelCreatedHandler,
  [EventType.ChannelDeleted]: channelDeletedHandler,
  [EventType.MessageCreated]: messageCreatedOrUpdatedHandler,
  [EventType.MessageUpdated]: messageCreatedOrUpdatedHandler,
  [EventType.MessageDeleted]: messageDeletedHandler,
  [EventType.ReplyCreated]: replyCreatedOrUpdatedHandler,
  [EventType.ReplyUpdated]: replyCreatedOrUpdatedHandler,
  [EventType.ReplyDeleted]: replyDeletedHandler,
};
export const teamsEventHandler = async (context: TeamsWebhookHandlerContext) => {
  const payload = context.event.data.payload;
  const type = payload.event;
  const eventHandler = teamsEventHandlers[type];

  return eventHandler(payload, context);
};
