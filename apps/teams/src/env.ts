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

export const env = z
  .object({
    CHANNELS_SYNC_MAX_RETRY: zEnvRetry(),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    DATABASE_URL: z.string().min(1),
    DELETE_DATA_PROTECTION_MAX_RETRY: zEnvRetry(),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    MESSAGES_SYNC_BATCH_SIZE: z.string(),
    MESSAGES_SYNC_MAX_RETRY: zEnvRetry(),
    MICROSOFT_API_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
    MICROSOFT_AUTH_API_URL: z.string().url().default('https://login.microsoftonline.com'),
    MICROSOFT_CLIENT_ID: z.string().min(1),
    MICROSOFT_CLIENT_SECRET: z.string().min(1),
    MICROSOFT_INSTALL_URL: z
      .string()
      .url()
      .default('https://login.microsoftonline.com/organizations/adminconsent'),
    MICROSOFT_REDIRECT_URI: z.string().url(),
    MICROSOFT_WEBHOOK_PUBLIC_CERTIFICATE_ID: z.string(),
    MICROSOFT_WEBHOOK_PUBLIC_CERTIFICATE: z.string(),
    REFRESH_DATA_PROTECTION_MAX_RETRY: zEnvRetry(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    REPLIES_SYNC_BATCH_SIZE: z.string(),
    REPLIES_SYNC_MAX_RETRY: zEnvRetry(),
    SUBSCRIBE_EXPIRATION_DAYS: z.string(),
    SUBSCRIBE_SYNC_MAX_RETRY: zEnvRetry(),
    SUBSCRIPTION_REMOVAL_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    TEAMS_CHANNELS_SYNC_CONCURRENCY: z.coerce.number().int().positive().default(15),
    TEAMS_MESSAGES_SYNC_CONCURRENCY: z.coerce.number().int().positive().default(10),
    TEAMS_REPLIES_SYNC_CONCURRENCY: z.coerce.number().int().positive().default(10),
    TEAMS_SYNC_BATCH_SIZE: z.string(),
    TEAMS_SYNC_CRON: z.string(),
    TEAMS_SYNC_MAX_RETRY: zEnvRetry(),
    TOKEN_REFRESH_CRON: z.string().default('*/30 * * * *'),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_BATCH_SIZE: z.string(),
    USERS_SYNC_CRON: z.string(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    VERCEL_ENV: z.string().min(1).optional(),
    WEBHOOK_URL: z.string().url(),
  })
  .parse(process.env);
