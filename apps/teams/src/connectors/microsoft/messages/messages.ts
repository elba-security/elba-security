import { env } from '@/env';
import { messageSchema } from '@/connectors/microsoft/schemes';
import type { MicrosoftMessage } from '@/connectors/microsoft/types';
import { MicrosoftError } from '../commons/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../commons/pagination';

export type GetMessagesParams = {
  token: string;
  teamId: string;
  channelId: string;
  skipToken?: string | null;
};

export type GetMessageParams = Omit<GetMessagesParams, 'skipToken'> & {
  messageId: string;
};

export const getMessages = async ({ token, teamId, skipToken, channelId }: GetMessagesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/teams/${teamId}/channels/${channelId}/messages`);
  url.searchParams.append('$top', String(env.MESSAGES_SYNC_BATCH_SIZE));

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'include-unknown-enum-members',
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve messages', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<object>;

  const validMessages: MicrosoftMessage[] = [];
  const invalidMessages: unknown[] = [];

  for (const message of data.value) {
    const result = messageSchema.safeParse({ ...message, type: 'message' });
    if (result.success) {
      if (result.data.messageType === 'message') {
        validMessages.push(result.data);
      }
    } else {
      invalidMessages.push(message);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { nextSkipToken, invalidMessages, validMessages };
};

export const getMessage = async ({ token, teamId, channelId, messageId }: GetMessageParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/teams/${teamId}/channels/${channelId}/messages/${messageId}`
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'include-unknown-enum-members',
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve message', { response });
  }

  const data = (await response.json()) as MicrosoftMessage;

  if (data.messageType !== 'message') {
    return;
  }

  const message: MicrosoftMessage = messageSchema.parse({
    ...data,
    type: 'message',
  });

  return message;
};
