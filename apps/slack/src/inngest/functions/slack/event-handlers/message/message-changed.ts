import { genericMessageHandler } from './message';
import type { SlackMessageHandler } from './types';

export const messageChangedHandler: SlackMessageHandler<'message_changed'> = async ({ event }) => {
  // We only want to support generic messages
  // TODO: let generic message handler handle subtype?
  if (event.message.subtype || event.previous_message.subtype) {
    return {
      message: 'Ignored: unhandled message changed subtype',
      previousSubtype: event.previous_message.subtype,
      subtype: event.message.subtype,
    };
  }

  // Ignore message if text didn't change
  if (event.previous_message.text === event.message.text) {
    return {
      message: "Ignored: message content hasn't changed",
      teamId: event.message.team,
      channelId: event.message.channel,
      messageId: event.message.ts,
    };
  }

  return genericMessageHandler(event.message);
};
