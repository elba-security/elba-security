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
    CHECKR_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    VERCEL_ENV: z.string().min(1).optional(),
    CHECKR_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    CHECKR_API_BASE_URL: z.string().url(),
  })
  .parse(process.env);
