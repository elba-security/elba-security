import { z } from 'zod';

export const nangoCredentialsSchema = z.object({
  apiKey: z.string(),
});

export const nangoConnectionConfigSchema = z.object({
  apiUsername: z.string(),
  defaultHost: z.string(),
});
