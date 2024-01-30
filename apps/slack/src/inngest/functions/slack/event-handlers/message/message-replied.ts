import { genericMessageHandler } from './message';
import type { SlackMessageHandler } from './types';

export const messageRepliedHandler: SlackMessageHandler<'message_replied'> = async ({ event }) => {
  return genericMessageHandler(event.message as never);
};
