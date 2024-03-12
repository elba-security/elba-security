import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const messageMetadataSchema = z.object({
    messageId: z.string().min(1),
    channelId: z.string().min(1),
    teamId: z.string().min(1),
    organisationId: z.string().min(1),
    type: z.string(),
});

export type MessageMetadata = zInfer<typeof messageMetadataSchema>;
