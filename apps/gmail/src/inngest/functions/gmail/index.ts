import { type ListGmailMessagesRequested } from './list-messages';
import { listGmailMessages } from './list-messages';

export const gmailFunctions = [listGmailMessages];

export type GmailEvents = ListGmailMessagesRequested;
