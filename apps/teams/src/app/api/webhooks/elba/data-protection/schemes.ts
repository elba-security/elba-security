import { z } from 'zod';

export const elbaPayloadSchema = z.object({
  id: z.string(),
  metadata: z.object({
    teamId: z.string(),
    organisationId: z.string(),
    channelId: z.string(),
    messageId: z.string(),
    replyId: z.string().optional(),
    type: z.union([z.literal('message'), z.literal('reply')]),
  }),
  organisationId: z.string(),
});

export const startSyncSchema = z.object({
  organisationId: z.string(),
});
