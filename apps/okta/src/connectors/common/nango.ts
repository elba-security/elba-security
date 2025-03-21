import { z } from 'zod';

export const nangoCredentialsSchema = z.object({
  access_token: z.string(),
});

export const nangoConnectionConfigSchema = z.object({
  subdomain: z.string(),
});
