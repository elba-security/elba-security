import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const messageMetadataSchema = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  teamId: z.string().min(1),
  type: z.enum(['message', 'reply']),
});

export type MessageMetadata = zInfer<typeof messageMetadataSchema>;
