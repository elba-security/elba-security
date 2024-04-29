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
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    VERCEL_ENV: z.string().min(1).optional(),
    MICROSOFT_INSTALL_URL: z
      .string()
      .url()
      .default('https://login.microsoftonline.com/organizations/adminconsent'),
    MICROSOFT_API_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
    MICROSOFT_AUTH_API_URL: z.string().url().default('https://login.microsoftonline.com'),
    MICROSOFT_CLIENT_ID: z.string().min(1),
    MICROSOFT_CLIENT_SECRET: z.string().min(1),
    MICROSOFT_REDIRECT_URI: z.string().url(),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_BATCH_SIZE: z.string(),
    USERS_SYNC_CRON: z.string(),
    TEAMS_SYNC_BATCH_SIZE: z.string(),
    TEAMS_SYNC_MAX_RETRY: zEnvRetry(),
    CHANNELS_SYNC_MAX_RETRY: zEnvRetry(),
    MESSAGES_SYNC_BATCH_SIZE: z.string(),
    MESSAGES_SYNC_MAX_RETRY: zEnvRetry(),
    REPLIES_SYNC_MAX_RETRY: zEnvRetry(),
    REPLIES_SYNC_BATCH_SIZE: z.string(),
    SUBSCRIBE_SYNC_MAX_RETRY: zEnvRetry(),
    WEBHOOK_URL: z.string().url(),
    SUBSCRIBE_EXPIRATION_DAYS: z.string(),
    REFRESH_DATA_PROTECTION_MAX_RETRY: zEnvRetry(),
    DELETE_DATA_PROTECTION_MAX_RETRY: zEnvRetry(),
    TEAMS_SYNC_CRON: z.string(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    MICROSOFT_WEBHOOK_PUBLIC_CERTIFICATE: z.string(),
    MICROSOFT_WEBHOOK_PUBLIC_CERTIFICATE_ID: z.string(),
  })
  .parse(process.env);
