import { z } from 'zod';

export const nangoRawCredentialsSchema = z.object({
  api_domain: z.string().url(),
});
