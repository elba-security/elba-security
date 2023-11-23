import type { infer as zInfer } from 'zod';
import { z } from 'zod';

export const updateConnectionStatusSchema = z.object({
  hasError: z.boolean(),
});

export type UpdateConnectionStatus = zInfer<typeof updateConnectionStatusSchema>;
