import { z } from 'zod';

export const nangoConnectionConfigSchema = z.object({
  subdomain: z.string(),
});
