import type { TeamsWebhookHandlerContext } from '@/inngest/functions/teams/handle-team-webhook-event';
import type { WebhookPayload } from '@/app/api/webhooks/microsoft/event-handler/service';
import { EventType } from '@/app/api/webhooks/microsoft/event-handler/service';
import { channelDeletedHandler } from './channel-deleted';
import { channelCreatedHandler } from './channel-created';
import { messageCreatedOrUpdatedHandler } from './message-created-updated';
import { replyCreatedOrUpdatedHandler } from './reply-created-updated';
import { messageDeletedHandler } from './message-deleted';
import { replyDeletedHandler } from './reply-deleted';

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
