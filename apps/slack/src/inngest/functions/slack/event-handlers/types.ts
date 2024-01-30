import type { EnvelopedEvent, KnownEventFromType, SlackEvent } from '@slack/bolt';
import type { GetInngestFunctionInput } from '@/inngest/client';
import type { HandleSlackWebhookEventEventName } from '../handle-slack-webhook-event';

export type SlackWebhookHandlerContext = GetInngestFunctionInput<HandleSlackWebhookEventEventName>;

export type SlackEventHandler<T extends SlackEvent['type']> = (
  event: EnvelopedEvent<KnownEventFromType<T>>,
  context: SlackWebhookHandlerContext
) => Promise<unknown>;

export type SlackEventHandlers = Partial<{
  [EventType in SlackEvent['type']]: SlackEventHandler<EventType>;
}>;
