import { z } from 'zod';

export const envSchema = z.object({
  ELBA_REDIRECT_URL: z.string().min(1),
  ELBA_SOURCE_ID: z.string().uuid(),
  ELBA_API_KEY: z.string().min(1),
  ELBA_API_BASE_URL: z.string().url(),
  USERS_SYNC_CRON: z.string().default('0 0 * * *'),
  THIRD_PARTY_APPS_SYNC_CRON: z.string().default('0 0 * * *'),
  DATA_PROTECTION_SYNC_CRON: z.string().default('0 0 * * *'),
});

export const env = envSchema.parse(process.env);
