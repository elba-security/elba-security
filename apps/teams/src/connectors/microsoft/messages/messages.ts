import { env } from '@/env';
import { commonMessageSchema, messageSchema } from '@/connectors/microsoft/schemes';
import type { MicrosoftMessage, MicrosoftReply } from '@/connectors/microsoft/types';
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
  url.searchParams.append('$expand', 'replies');

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
    const result = messageSchema.safeParse({
      ...message,
      replies:
        'replies' in message && Array.isArray(message.replies)
          ? message.replies.map((reply: MicrosoftReply) => ({ ...reply, type: 'reply' }))
          : [],
      type: 'message',
    });

    if (result.success) {
      validMessages.push(result.data);
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
    if (response.status === 404) {
      return null;
    }
    throw new MicrosoftError('Could not retrieve message', { response });
  }

  const data = (await response.json()) as object;

  const result = commonMessageSchema.safeParse({
    ...data,
    type: 'message',
  });

  if (!result.success) {
    return null;
  }

  return result.data;
};
