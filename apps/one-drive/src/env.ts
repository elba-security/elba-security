import { z } from 'zod';

const zEnvRetry = () =>
  z
    .unknown()
    .transform((value) => {
      if (typeof value === 'string') return Number(value);
      return value;
    })
    .pipe(z.number().int().min(0).max(20))
    .default(3) as unknown as z.ZodLiteral<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  >;

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
    MICROSOFT_DATA_PROTECTION_ITEMS_SYNC_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive()
      .min(1)
      .default(1),
    MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .min(1)
      .default(100),
    // We need to set lower value because after fetching items list we will fetch item-permissions without delay
    MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .min(1)
      .default(MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE_DEFAULT_VALUE),
    // Amount of files for which we get permissions, directly depends on MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE
    MICROSOFT_DATA_PROTECTION_ITEM_PERMISSIONS_CHUNK_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .min(1)
      .max(MICROSOFT_DATA_PROTECTION_ITEM_SYNC_SIZE_DEFAULT_VALUE)
      .default(15),
    MICROSOFT_DATA_PROTECTION_SYNC_MAX_RETRY: zEnvRetry(),
    MICROSOFT_DATA_PROTECTION_CRON_SYNC: z.string().default('0 0 * * 1-5'),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_CRON: z.string().default('0 0 * * 1-5'),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    SITES_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
