import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    DATABASE_URL: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    INTERCOM_API_BASE_URL: z.string().url('https://api.intercom.io'),
    INTERCOM_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    INTERCOM_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    VERCEL_ENV: z.string().min(1).optional(),
    NANGO_SECRET_KEY: z.string().min(1),
    NEXT_PUBLIC_NANGO_INTEGRATION_ID: z.string().min(1),
    NEXT_PUBLIC_NANGO_PUBLIC_KEY: z.string().min(1),
  })
  .parse(process.env);
