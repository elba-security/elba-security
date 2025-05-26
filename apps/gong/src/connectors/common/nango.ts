import { z } from 'zod';

export const nangoCredentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
});