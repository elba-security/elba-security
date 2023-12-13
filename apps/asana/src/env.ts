import { z } from 'zod';

export const env = z
  .object({
    ASANA_API_BASE_URL: z.string().url(),
    ASANA_CLIENT_ID: z.string().min(1),
    ASANA_CLIENT_SECRET: z.string().min(1),
    ASANA_REDIRECT_URI: z.string().min(1),
    ASANA_WEBHOOK_URI: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    POSTGRES_URL: z.string().min(1),
    POSTGRES_HOST: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().positive(),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DATABASE: z.string().min(1),
    POSTGRES_PROXY_PORT: z.coerce.number().int().positive(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    USERS_SYNC_JOB_BATCH_SIZE: z.coerce.number().min(1).int().default(100),
    USERS_SYNC_CRON: z.string().min(1),
    TOKEN_REFRESH_CRON: z.string().min(1)
  })
  .parse(process.env);
