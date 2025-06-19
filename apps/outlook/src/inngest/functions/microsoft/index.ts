import { type GetOutlookMessageRequested, getOutlookMessage } from './get-message';
import { type ListOutlookMessagesRequested, listOutlookMessages } from './list-messages';

export const microsoftFunctions = [listOutlookMessages, getOutlookMessage];

export type MicrosoftEvents = ListOutlookMessagesRequested & GetOutlookMessageRequested;
