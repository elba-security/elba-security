import { z } from 'zod';

export const nangoRawCredentialsSchema = z.object({
  owner: z.string().url(),
  organization: z.string().url(),
});
