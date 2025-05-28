import { getGmailMessage, type GetGmailMessageRequested } from './get-message';
import { type ListGmailMessagesRequested } from './list-messages';
import { listGmailMessages } from './list-messages';

export const gmailFunctions = [listGmailMessages, getGmailMessage];

export type GmailEvents = ListGmailMessagesRequested & GetGmailMessageRequested;
