import { z } from 'zod';
import { env } from '@/common/env/server';
import { encryptElbaInngestText } from '@/common/crypto';
import { MicrosoftError } from '../common/error';
import { getNextSkipFromNextLink, type MicrosoftPaginatedResponse } from '../common/pagination';

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

const listedMessageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: z.object({
    emailAddress: z.object({
      name: z.string(),
      address: z.string(),
    }),
  }),
  toRecipients: z.array(
    z.object({
      emailAddress: z.object({
        name: z.string(),
        address: z.string(),
      }),
    })
  ),
  body: z.object({
    contentType: z.string(),
    content: z.string(),
  }),
});

type GetMessagesParams = {
  token: string;
  userId: string;
  filter: string;
  skipStep?: string | null;
};

export type OutlookMessage = {
  id: string;
  subject: string;
  from: string;
  toRecipients: string[];
  body: string;
};

export const getMessages = async ({ token, userId, skipStep, filter }: GetMessagesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/users/${userId}/messages`);
  url.searchParams.append('$top', String(env.MESSAGES_SYNC_BATCH_SIZE));
  url.searchParams.append('$select', 'id,subject,from,toRecipients,body');
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

  const messages: OutlookMessage[] = [];

  for (const message of data.value) {
    const result = listedMessageSchema.safeParse(message);
    if (result.success) {
      messages.push({
        id: result.data.id,
        subject: await encryptElbaInngestText(result.data.subject),
        from: await encryptElbaInngestText(result.data.from.emailAddress.address),
        toRecipients: await Promise.all(
          result.data.toRecipients.map((item) => encryptElbaInngestText(item.emailAddress.address))
        ),
        body: await encryptElbaInngestText(result.data.body.content.slice(0, 1000)), // TODO: make 1000 as env var,
      });
    }
  }

  const nextSkip = getNextSkipFromNextLink(data['@odata.nextLink']);

  return { nextSkip, messages };
};
