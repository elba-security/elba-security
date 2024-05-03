import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt(),
    VERCEL_ENV: z.string().min(1).optional(),
    MONDAY_API_BASE_URL: z.string().url().default('https://api.monday.com/v2'),
    MONDAY_AUTH_URL: z.string().min(1),
    MONDAY_CLIENT_ID: z.string().min(1),
    MONDAY_CLIENT_SECRET: z.string().min(1),
    MONDAY_REDIRECT_URL: z.string().min(1),
    MONDAY_USERS_SYNC_BATCH_SIZE: zEnvInt().default(400),
    MONDAY_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
  })
  .parse(process.env);