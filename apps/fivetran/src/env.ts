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
    FIVETRAN_API_BASE_URL: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt(),
    VERCEL_ENV: z.string().min(1).optional(),
    FIVETRAN_USERS_SYNC_CRON: z.string(),
    FIVETRAN_USERS_DELETE_CONCURRENCY: zEnvInt().default(5),
  })
  .parse(process.env);
