import { z } from 'zod';

export const nangoCredentialsSchema = z.object({
  apiKey: z.string(),
});

export const nangoConnectionConfigSchema = z.object({
  siteParameter: z.string(),
  applicationKey: z.string(),
});
