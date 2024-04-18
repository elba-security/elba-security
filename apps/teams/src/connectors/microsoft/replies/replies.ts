import { env } from '@/env';
import { commonMessageSchema } from '@/connectors/microsoft/schemes';
import type { MicrosoftReply } from '@/connectors/microsoft/types';
import { MicrosoftError } from '../commons/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../commons/pagination';

export type GetRepliesParams = {
  token: string;
  teamId: string;
  channelId: string;
  skipToken?: string | null;
  messageId: string;
};

type GetReplyParams = Omit<GetRepliesParams, 'skipToken'> & {
  replyId: string;
};

export const getReplies = async ({
  token,
  teamId,
  skipToken,
  channelId,
  messageId,
}: GetRepliesParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`
  );
  url.searchParams.append('$top', String(env.REPLIES_SYNC_BATCH_SIZE));

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
    throw new MicrosoftError('Could not retrieve replies', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<object>;

  const validReplies: MicrosoftReply[] = [];
  const invalidReplies: unknown[] = [];

  for (const reply of data.value) {
    const result = commonMessageSchema.safeParse({ ...reply, type: 'reply' });

    if (result.success) {
      validReplies.push(result.data);
    } else {
      invalidReplies.push(reply);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { nextSkipToken, validReplies, invalidReplies };
};

export const getReply = async ({
  token,
  teamId,
  channelId,
  messageId,
  replyId,
}: GetReplyParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies/${replyId}`
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
    throw new MicrosoftError('Could not retrieve reply', { response });
  }

  const data = (await response.json()) as object;

  const result = commonMessageSchema.safeParse({
    ...data,
    type: 'reply',
  });

  if (!result.success) {
    return null;
  }

  return result.data;
};
