import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    VERCEL_ENV: z.string().min(1).optional(),
    USERS_SYNC_CRON: z.string(),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(200),
    WEBFLOW_CLIENT_ID: z.string().min(1),
    WEBFLOW_CLIENT_SECRET: z.string().min(1),
    WEBFLOW_REDIRECT_URI: z.string().url().min(1),
    WEBFLOW_API_BASE_URL: z.string().url().default('https://api.webflow.com'),
    ENCRYPTION_KEY: z.string().length(64),
    WEBFLOW_DELETE_USER_CONCURRENCY: zEnvInt().default(1),
  })
  .parse(process.env);
