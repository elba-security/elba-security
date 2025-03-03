import { z } from 'zod';

export const nangoCredentialsSchema = z.object({
  apiKey: z.string(),
});
