import type { MicrosoftMessage } from '@/connectors/microsoft/types';

export type MicrosoftMessageObject = Omit<MicrosoftMessage, 'replies@odata.nextLink' | 'replies'>;

export type MicrosoftMessageObjectWithoutContent = Omit<MicrosoftMessageObject, 'body'> & {
  body: null;
};
