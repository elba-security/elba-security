import type { MicrosoftMessage } from '@/connectors/microsoft/types';

export const filterMessagesByMessageType = (data: MicrosoftMessage[]) =>
  data.filter((message) => message.messageType === 'message');
