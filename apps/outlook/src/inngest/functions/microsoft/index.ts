import { type ListOutlookMessagesRequested, listOutlookMessages } from './list-messages';

export const microsoftFunctions = [listOutlookMessages];

export type MicrosoftEvents = ListOutlookMessagesRequested;
