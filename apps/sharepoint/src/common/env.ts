import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

const MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE_DEFAULT_VALUE = 15;

export const env = z
  .object({
    MICROSOFT_CLIENT_ID: z.string().min(1),
    MICROSOFT_CLIENT_SECRET: z.string().min(1),
    MICROSOFT_REDIRECT_URI: z.string().url(),
    MICROSOFT_INSTALL_URL: z
      .string()
      .url()
      .default('https://login.microsoftonline.com/organizations/adminconsent'),
    MICROSOFT_API_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
    MICROSOFT_AUTH_API_URL: z.string().url().default('https://login.microsoftonline.com'),
    MICROSOFT_DATA_PROTECTION_SYNC_CONCURRENCY: zEnvInt().min(1).default(2),
    MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY: zEnvInt().min(1).default(1),
    MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE: zEnvInt().min(1).default(100),
    // We need to set lower value because after fetching items list we will fetch item-permissions without delay
    MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE: zEnvInt()
      .min(1)
      .default(MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE_DEFAULT_VALUE),
    MICROSOFT_DATA_PROTECTION_CRON_SYNC: z.string().default('0 0 * * 6'),
    MICROSOFT_DATA_PROTECTION_REFRESH_DELETE_CONCURRENCY: zEnvInt().min(1).default(10),
    MICROSOFT_CREATE_SUBSCRIPTION_CONCURRENCY: zEnvInt().min(1).default(10),
    SUBSCRIPTION_EXPIRATION_DAYS: z.string().default('25'),
    WEBHOOK_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    USERS_SYNC_CRON: z.string().default('0 0 * * 1-5'),
    USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    SITES_SYNC_BATCH_SIZE: zEnvInt().default(100),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
