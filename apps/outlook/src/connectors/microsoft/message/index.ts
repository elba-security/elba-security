import { env } from '@/common/env/server';
import { encryptElbaInngestText } from '@/common/crypto';
import { MicrosoftError } from '../common/error';
import { getNextSkipFromNextLink, type MicrosoftPaginatedResponse } from '../common/pagination';
import { type ListOutlookMessage, type OutlookMessage } from '../types';
import { listMessageSchema, messageSchema } from '../schemes';

export const formatGraphMessagesFilter = ({
  after,
  before,
}: {
  after?: Date | null;
  before?: Date | null;
}) => {
  const filters: string[] = [];
  if (after) {
    filters.push(`receivedDateTime ge ${after.toISOString()}`);
  }
  if (before) {
    filters.push(`receivedDateTime le ${before.toISOString()}`);
  }
  return filters.join(' and ');
};

type GetMessagesParams = {
  token: string;
  userId: string;
  filter: string;
  skipStep?: string | null;
};

type GetMessageParams = {
  token: string;
  userId: string;
  messageId: string;
};

export const getMessages = async ({ token, userId, skipStep, filter }: GetMessagesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/users/${userId}/messages`);
  url.searchParams.append('$top', String(env.MESSAGES_SYNC_BATCH_SIZE));
  url.searchParams.append('$select', 'id');
  url.searchParams.append('$filter', filter);

  if (skipStep) {
    url.searchParams.append('$skip', skipStep);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve messages', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<object>;

  const messages: ListOutlookMessage[] = [];

  for (const message of data.value) {
    const result = listMessageSchema.safeParse(message);
    if (result.success) {
      messages.push(result.data);
    }
  }

  const nextSkip = getNextSkipFromNextLink(data['@odata.nextLink']);

  return { nextSkip, messages };
};

export const getMessage = async ({
  token,
  userId,
  messageId,
}: GetMessageParams): Promise<OutlookMessage | null> => {
  const url = new URL(`${env.MICROSOFT_API_URL}/users/${userId}/messages/${messageId}`);
  url.searchParams.append('$select', 'id,subject,from,toRecipients,body');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError(`Could not retrieve message with id=${messageId}`, { response });
  }

  const data = (await response.json()) as object;

  const { success, data: message } = messageSchema.safeParse(data);
  if (!success) {
    return null;
  }

  return {
    id: message.id,
    subject: await encryptElbaInngestText(message.subject),
    from: await encryptElbaInngestText(message.from.emailAddress.address),
    toRecipients: await encryptElbaInngestText(
      message.toRecipients.map((item) => item.emailAddress.address).join(', ')
    ),
    body: await encryptElbaInngestText(
      message.body.content.slice(0, Number(env.MAX_MESSAGE_BODY_LENGTH))
    ),
  };
};
