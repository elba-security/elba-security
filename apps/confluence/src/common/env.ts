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

const zNatural = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    CONFLUENCE_CLIENT_ID: z.string().min(1),
    CONFLUENCE_CLIENT_SECRET: z.string().min(1),
    CONFLUENCE_REDIRECT_URI: z.string().url(),
    DATABASE_PROXY_PORT: zNatural().optional(),
    DATABASE_URL: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    ENCRYPTION_KEY: z.string().length(64),
    DATA_PROTECTION_PERSONAL_SPACE_PERMISSIONS_MAX_PAGE: zNatural().default(1),
    DATA_PROTECTION_PERSONAL_SPACE_BATCH_SIZE: zNatural().default(25),
    DATA_PROTECTION_PAGES_BATCH_SIZE: zNatural().default(50),
    DATA_PROTECTION_GLOBAL_SPACE_PERMISSIONS_MAX_PAGE: zNatural().default(10),
    DATA_PROTECTION_GLOBAL_SPACE_BATCH_SIZE: zNatural().default(5),
    DATA_PROTECTION_SYNC_CRON: z.string().default('0 0 * * *'),
    DATA_PROTECTION_DELETE_OBJECT_PERMISSIONS_ORGANISATION_CONCURRENCY: zNatural().default(5),
    DATA_PROTECTION_DELETE_OBJECT_PERMISSIONS_MAX_RETRY: zEnvRetry(),
    DATA_PROTECTION_DELETE_PAGE_RESTRICTIONS_ORGANISATION_CONCURRENCY: zNatural().default(2),
    DATA_PROTECTION_DELETE_PAGE_RESTRICTIONS_MAX_RETRY: zEnvRetry(),
    DATA_PROTECTION_DELETE_PAGE_RETRICTIONS_BATCH_SIZE: zNatural().default(25),
    DATA_PROTECTION_DELETE_SPACE_PERMISSIONS_ORGANISATION_CONCURRENCY: zNatural().default(2),
    DATA_PROTECTION_DELETE_SPACE_PERMISSIONS_MAX_RETRY: zEnvRetry(),
    DATA_PROTECTION_DELETE_SPACE_PERMISSIONS_BATCH_SIZE: zNatural().default(50),
    DATA_PROTECTION_REFRESH_OBJECT_ORGANISATION_CONCURRENCY: zNatural().default(5),
    DATA_PROTECTION_REFRESH_OBJECT_MAX_RETRY: zEnvRetry(),
    DATA_PROTECTION_SYNC_PAGES_MAX_RETRY: zEnvRetry(),
    DATA_PROTECTION_SYNC_SPACES_MAX_RETRY: zEnvRetry(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_GROUPS_BATCH_SIZE: zNatural().default(25),
    USERS_SYNC_GROUP_USERS_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_CRON: z.string().default('0 0 * * *'),
  })
  .parse(process.env);
