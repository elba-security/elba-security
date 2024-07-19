import { z } from 'zod';

export const commonMessageSchema = z.object({
  id: z.string(),
  webUrl: z.string().url(),
  body: z.object({
    content: z.string(),
  }),
  from: z.object({
    user: z
      .object({
        id: z.string(),
      })
      .nullable(),
    application: z
      .object({
        id: z.string(),
      })
      .nullable(),
  }),
  lastEditedDateTime: z.string().nullable(),
  createdDateTime: z.string(),
  etag: z.string(),
  messageType: z.enum([
    'typing',
    'message',
    'chatEvent',
    'unknownFutureValue',
    'systemEventMessage',
  ]),
  type: z.enum(['message', 'reply']),
});

const replyMessage = z.object({
  replies: z.array(commonMessageSchema),
  'replies@odata.nextLink': z.string().optional(),
});

export const messageSchema = commonMessageSchema.merge(replyMessage);
