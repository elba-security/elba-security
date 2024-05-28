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
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
    HARVEST_APP_INSTALL_URL: z.string().url().default('https://id.getharvest.com'),
    HARVEST_API_BASE_URL: z.string().url().default('https://api.harvestapp.com/v2'),
    HARVEST_CLIENT_ID: z.string().min(1),
    HARVEST_CLIENT_SECRET: z.string().min(1),
    HARVEST_REDIRECT_URI: z.string().url(),
    HARVEST_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    HARVEST_USERS_SYNC_BATCH_SIZE: zEnvInt().default(400),
  })
  .parse(process.env);
