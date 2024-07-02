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
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    STATSIG_API_BASE_URL: z.string().min(1).default('https://statsigapi.net/console/v1'),
    STATSIG_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    STATSIG_USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
