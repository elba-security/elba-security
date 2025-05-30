import { z } from 'zod';

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    BAMBOOHR_API_BASE_URL: z.string().url(),
    BAMBOOHR_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);
