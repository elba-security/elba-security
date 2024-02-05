import { conversationsFunctions, type ConversationsEvents } from './conversations';
import { dataProtectionFunctions } from './data-protection';
import { slackFunctions, type SlackEvents } from './slack';
import { usersFunctions, type UsersEvents } from './users';

export * from './conversations';
export * from './data-protection';
export * from './slack';
export * from './users';

export const inngestFunctions = [
  ...conversationsFunctions,
  ...dataProtectionFunctions,
  ...slackFunctions,
  ...usersFunctions,
];

export type InngestEvents = ConversationsEvents & SlackEvents & UsersEvents;
