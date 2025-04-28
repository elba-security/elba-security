import { z } from 'zod';

export const nangoCredentialsSchema = z.object({
  dev_key: z.string(),
  session_id: z.string(),
});
