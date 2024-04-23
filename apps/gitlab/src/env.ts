import { z } from 'zod';

export const env = z
  .object({
    GITLAB_APP_INSTALL_URL: z.string().url(),
    GITLAB_API_BASE_URL: z.string().url(),
    GITLAB_CLIENT_ID: z.string().min(1),
    GITLAB_CLIENT_SECRET: z.string().min(1),
    GITLAB_REDIRECT_URI: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
    USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(2),
  })
  .parse(process.env);
