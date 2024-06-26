import { zInngestRetry } from '@elba-security/zod';
import { z } from 'zod';

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
    REMOVE_ORGANISATION_MAX_RETRY: zInngestRetry(),
    THIRD_PARTY_APPS_SYNC_CRON: z.string().default('0 0 * * *'),
    THIRD_PARTY_APPS_SYNC_BATCH_SIZE: z.coerce.number().positive().default(10),
    THIRD_PARTY_APPS_SYNC_MAX_RETRY: zInngestRetry(),
    THIRD_PARTY_APPS_REVOKE_APP_PERMISSION_MAX_RETRY: zInngestRetry(),
    THIRD_PARTY_APPS_REFRESH_APP_PERMISSION_MAX_RETRY: zInngestRetry(),
    TOKEN_REFRESH_MAX_RETRY: zInngestRetry(),
    USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(100),
    USERS_SYNC_MAX_RETRY: zInngestRetry(),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
