import { gmail_v1 as gmail } from '@googleapis/gmail';
import { z } from 'zod';
import { extractTextFromMessage } from './utils/email';

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
  id: z.string(),
  subject: z.string(),
  from: z.string(),
  to: z.string(),
  body: z.string().min(100), // TODO: make it in env var ?
});

export const getMessage = async ({
  format = 'full',
  ...params
}: gmail.Params$Resource$Users$Messages$Get): Promise<
  { message: z.infer<typeof messageSchema> } | { message: null; error: Error }
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

    const result = messageSchema.safeParse({
      subject: getHeaderValue('subject'),
      from: getHeaderValue('from'),
      to: getHeaderValue('to'),
      body: extractTextFromMessage(message.payload)?.slice(0, 1000), // TODO: make 1000 as env var
    });

    if (result.success) {
      return {
        message: result.data,
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
