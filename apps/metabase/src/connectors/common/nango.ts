import { z } from 'zod';

export const nangoConnectionConfigSchema = z.object({
  domain: z.string(),
});
