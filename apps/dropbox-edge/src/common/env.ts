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
    DROPBOX_API_BASE_URL: z.string().url().min(1),
    DROPBOX_APP_INSTALL_URL: z.string().url().min(1),
    DROPBOX_CLIENT_ID: z.string(),
    DROPBOX_CLIENT_SECRET: z.string(),
    DROPBOX_REDIRECT_URI: z.string().url(),
    DROPBOX_DELETE_USER_CONCURRENCY: zEnvInt().default(1),
    DROPBOX_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    DROPBOX_SYNC_USERS_BATCH_SIZE: zEnvInt().default(400),
    VERCEL_ENV: z.string().min(1).optional(),
    ENCRYPTION_KEY: z.string().min(1),
  })
  .parse(process.env);
