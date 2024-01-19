import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const slackTeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
});

export type SlackTeam = zInfer<typeof slackTeamSchema>;
