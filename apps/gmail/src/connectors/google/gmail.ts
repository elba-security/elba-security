import { gmail_v1 as gmail } from '@googleapis/gmail';
import { z } from 'zod';
import { env } from '@/common/env/server';
import { extractTextFromMessage } from './utils/email';

const getTimestampInSeconds = (value: Date) => (value.getTime() / 1000).toFixed(0);

type ListMessageQueryParams = {
  '-is': 'chat' | 'draft' | 'scheduled';
  '-in': 'trash' | 'spam' | 'sent';
  before: Date;
  after: Date;
};

type FormatListMessagesQueryParams = {
  [K in keyof ListMessageQueryParams]?: ListMessageQueryParams[K][] | ListMessageQueryParams[K];
};

export const formatListMessagesQuery = (params: FormatListMessagesQueryParams) => {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    const keyValues = value instanceof Array ? value : [value];
    for (const keyValue of keyValues) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ts inference issue
      if (keyValue === null || keyValue === undefined) {
        continue;
      }
      if (keyValue instanceof Date) {
        parts.push(`${key}:${getTimestampInSeconds(keyValue)}`);
      } else {
        parts.push(`${key}:${keyValue}`);
      }
    }
  }

  return parts.join(' ');
};

const listedMessageSchema = z.object({
  id: z.string(),
});

export const listMessages = async ({
  maxResults = 500,
  ...params
}: gmail.Params$Resource$Users$Messages$List) => {
  const {
    data: { messages: rawMessages, nextPageToken },
  } = await new gmail.Gmail({}).users.messages.list({ maxResults, ...params });

  const messages: z.infer<typeof listedMessageSchema>[] = [];
  for (const rawMessage of rawMessages || []) {
    const result = listedMessageSchema.safeParse(rawMessage);
    if (result.success) {
      messages.push(result.data);
    }
  }

  return { messages, nextPageToken };
};

const messageSchema = z.object({
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  body: z.string(),
});

export const getMessage = async ({
  format = 'full',
  ...params
}: gmail.Params$Resource$Users$Messages$Get): Promise<
  { message: z.infer<typeof messageSchema>; error: undefined } | { message: null; error: Error }
> => {
  try {
    const { data: message } = await new gmail.Gmail({}).users.messages.get({ format, ...params });

    if (!message.payload) {
      return {
        message: null,
        error: new Error('Message payload is missing'),
      };
    }

    const getHeaderValue = (headerName: string) => {
      return message.payload?.headers?.find((header) => header.name?.toLowerCase() === headerName)
        ?.value;
    };

    // Encrypt data with elba api key as it will be decrypted on elba side
    const result = messageSchema.safeParse({
      subject: getHeaderValue('subject'),
      from: getHeaderValue('from'),
      to: getHeaderValue('to'),
      body: extractTextFromMessage(message.payload)?.slice(0, env.MAX_EMAIL_BODY_LENGTH),
    });

    if (result.success) {
      return {
        message: result.data,
        error: undefined,
      };
    }

    return {
      message: null,
      error: result.error,
    };
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Start of error handling */
  } catch (error: any) {
    if (error?.code === 404) {
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- End of error handling */
      return {
        message: null,
        error: new Error('Could not find message', { cause: error }),
      };
    }

    throw error;
  }
};
