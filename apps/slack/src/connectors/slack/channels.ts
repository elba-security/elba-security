import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const slackChannelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  is_ext_shared: z.boolean().optional(),
});

export type SlackChannel = zInfer<typeof slackChannelSchema>;
