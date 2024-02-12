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
    MICROSOFT_CLIENT_ID: z.string().min(1),
    MICROSOFT_CLIENT_SECRET: z.string().min(1),
    MICROSOFT_REDIRECT_URI: z.string().url(),
    MICROSOFT_INSTALL_URL: z
      .string()
      .url()
      .default('https://login.microsoftonline.com/organizations/adminconsent'),
    MICROSOFT_API_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
    MICROSOFT_AUTH_API_URL: z.string().url().default('https://login.microsoftonline.com'),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().min(1),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    THIRD_PARTY_APPS_SYNC_CRON: z.string().default('0 0 * * *'),
    THIRD_PARTY_APPS_SYNC_BATCH_SIZE: z.coerce.number().positive().default(100),
    THIRD_PARTY_APPS_SYNC_MAX_RETRY: zEnvRetry(),
    THIRD_PARTY_APPS_REVOKE_APP_PERMISSION_MAX_RETRY: zEnvRetry(),
    THIRD_PARTY_APPS_REFRESH_APP_PERMISSION_MAX_RETRY: zEnvRetry(),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
