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
    ENCRYPTION_KEY: z.string().min(1),
    INTERCOM_API_BASE_URL: z.string().url('https://api.intercom.io'),
    INTERCOM_APP_INSTALL_URL: z.string().url('https://app.intercom.com/oauth'),
    INTERCOM_CLIENT_ID: z.string().min(1),
    INTERCOM_CLIENT_SECRET: z.string().min(1),
    INTERCOM_REDIRECT_URI: z.string().url(),
    INTERCOM_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    INTERCOM_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
