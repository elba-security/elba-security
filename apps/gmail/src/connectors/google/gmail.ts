import { gmail_v1 as gmail } from '@googleapis/gmail';
import { z } from 'zod';
import { type JWT } from 'google-auth-library';
import { env } from '@/common/env/server';
import { extractTextFromMessage } from './utils/email';
import { batchRequest, type BatchResponse } from './utils/batch';

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

// Minimal schema for https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages#Message
// It should be used only before force asserting type to gmail.Schema$Message
const retrievedMessageSchema = z.object({
  id: z.string(),
  payload: z.object({
    headers: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
      })
    ),
    body: z.object({}),
    parts: z.array(z.object({})),
  }),
});

const messageSchema = z.object({
  id: z.string(),
  subject: z.string().optional().default(''),
  // from is required for caching
  from: z.string(),
  to: z.string().optional().default(''),
  body: z.string(),
});

type Message = z.infer<typeof messageSchema>;

const parseRetrievedMessage = (batchedResponse: BatchResponse) => {
  try {
    retrievedMessageSchema.parse(batchedResponse.data);
    const retrievedMessage = batchedResponse.data as gmail.Schema$Message;

    const getHeaderValue = (headerName: string) => {
      return retrievedMessage.payload?.headers?.find(
        (header) => header.name?.toLowerCase() === headerName
      )?.value;
    };
    return {
      message: messageSchema.parse({
        id: retrievedMessage.id,
        subject: getHeaderValue('subject'),
        from: getHeaderValue('from'),
        to: getHeaderValue('to'),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- already checked by Zod schema
        body: extractTextFromMessage(retrievedMessage.payload!)?.slice(
          0,
          env.MAX_EMAIL_BODY_LENGTH
        ),
      }),
      error: null,
    };
  } catch (error) {
    return {
      message: null,
      error,
    };
  }
};

export const listMessages = async ({
  // Batch api limit is 100
  maxResults = 100,
  auth,
  ...params
}: Omit<gmail.Params$Resource$Users$Messages$List, 'auth'> & { auth: JWT }) => {
  const {
    data: { messages: rawListedMessages, nextPageToken },
  } = await new gmail.Gmail({}).users.messages.list({ maxResults, auth, ...params });

  const listedMessages: z.infer<typeof listedMessageSchema>[] = [];
  for (const rawMessage of rawListedMessages || []) {
    const result = listedMessageSchema.safeParse(rawMessage);
    if (result.success) {
      listedMessages.push(result.data);
    }
  }

  const batchedResponses = await batchRequest({
    auth,
    requests: listedMessages.map(({ id }) => ({
      url: `/gmail/v1/users/${params.userId}/messages/${id}?format=full`,
      method: 'GET',
    })),
  });

  return batchedResponses.reduce(
    (acc, batchedResponse) => {
      const { error, message } = parseRetrievedMessage(batchedResponse);
      if (error) {
        acc.errors.push(error);
      }
      if (message) {
        acc.messages.push(message);
      }
      return acc;
    },
    {
      nextPageToken,
      messages: [] as Message[],
      errors: [] as unknown[],
    }
  );
};
