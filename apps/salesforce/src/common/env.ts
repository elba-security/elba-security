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
    VERCEL_ENV: z.string().min(1).optional(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    SALESFORCE_APP_INSTALL_URL: z.string().url(),
    SALESFORCE_CLIENT_ID: z.string().min(1),
    SALESFORCE_CLIENT_SECRET: z.string().min(1),
    SALESFORCE_REDIRECT_URI: z.string().url(),
    SALESFORCE_DELETE_USER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    SALESFORCE_USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
    SALESFORCE_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    SALESFORCE_USERS_SYNC_BATCH_SIZE: zEnvInt().default(20),
  })
  .parse(process.env);
