import type { SlackEventHandler } from '../types';
import { genericMessageHandler } from './message';
import { messageChangedHandler } from './message-changed';
import { messageDeletedHandler } from './message-deleted';
import { messageRepliedHandler } from './message-replied';
import type { SlackMessageHandlers } from './types';

const messageHandlers: SlackMessageHandlers = {
  message_replied: messageRepliedHandler, // message_replied is broken, event is currently sent through a generic message
  message_deleted: messageDeletedHandler,
  message_changed: messageChangedHandler,
};

export const messageHandler: SlackEventHandler<'message'> = async (event) => {
  // TODO: make sure to filter out message sent from another team
  // TODO: message_replied & thread_broadcast

  // TODO: Handle public - private channel conversion
  // if (event.subtype === 'channel_convert_to_public')
  // if (event.subtype === 'channel_convert_to_private')

  const messageEvent = event.event;

  // We only handle messages in public channels for now
  if (messageEvent.channel_type !== 'channel') {
    return { message: 'Ignored: unhandled channel type', channelType: messageEvent.channel_type };
  }

  const { subtype } = messageEvent;
  if (!subtype) {
    return genericMessageHandler(messageEvent);
  }

  const handler = messageHandlers[subtype];
  if (!handler) {
    return { message: 'Ignored: unhandled message subtype', subtype };
  }

  return handler(event as never);
};
