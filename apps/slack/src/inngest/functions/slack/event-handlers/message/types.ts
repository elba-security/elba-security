import type { EnvelopedEvent } from '@slack/bolt';
import type { MessageEvent } from '@slack/bolt/dist/types/events/message-events';

type KnownMessageFromSubtype<T extends string> = Extract<
  MessageEvent,
  {
    subtype: T;
  }
>;

export type SlackMessageSubtype = Exclude<MessageEvent['subtype'], undefined>;

export type SlackMessageHandler<T extends SlackMessageSubtype> = (
  event: EnvelopedEvent<KnownMessageFromSubtype<T>>
) => Promise<unknown>;

export type SlackMessageHandlers = Partial<{
  [Subtype in SlackMessageSubtype]: SlackMessageHandler<Subtype>;
}>;
