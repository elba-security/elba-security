import { z } from 'zod';

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive(),
    VERCEL_ENV: z.string().min(1).optional(),
    OPENAI_USERS_SYNC_CRON: z.string(),
    OPENAI_DELETE_USER_CONCURRENCY: z.coerce.number().int().positive(),
  })
  .parse(process.env);
