import type { SynchronizeConversationsEvents } from './synchronize-conversations';
import { synchronizeConversations } from './synchronize-conversations';
import type { SynchronizeConversationMessagesEvents } from './synchronize-conversation-messages';
import { synchronizeConversationMessages } from './synchronize-conversation-messages';
import type { SynchronizeConversationThreadMessagesEvents } from './synchronize-conversation-thread-messages';
import { synchronizeConversationThreadMessages } from './synchronize-conversation-thread-messages';

export type ConversationsEvents = SynchronizeConversationsEvents &
  SynchronizeConversationMessagesEvents &
  SynchronizeConversationThreadMessagesEvents;

export const conversationsFunctions = [
  synchronizeConversations,
  synchronizeConversationMessages,
  synchronizeConversationThreadMessages,
];
