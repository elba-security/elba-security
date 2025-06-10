import { z } from 'zod';
import { createEnv } from '@t3-oss/env-nextjs';

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

export const env = createEnv({
  isServer: process.env.NODE_ENV === 'test' ? true : undefined, // For vitest
  server: {
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    DATABASE_URL: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    OUTLOOK_AUTH_CLIENT_ID: z.string().min(1),
    OUTLOOK_AUTH_CLIENT_SECRET: z.string().min(1),
    OUTLOOK_AUTH_REDIRECT_URI: z.string().url(),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    MAIL_FOLDERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    MESSAGES_SYNC_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    USERS_SYNC_CONCURRENCY: z.coerce.number().int().positive().min(1),
    USERS_SYNC_CRON: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
    ELBA_INNGEST_ENCRYPTION_KEY: z
      .string()
      .length(64)
      .regex(/^(?:[0-9a-f]{2})+$/i),
    ELBA_INNGEST_ENCRYPTION_KEY_IV: z
      .string()
      .length(32)
      .regex(/^(?:[0-9a-f]{2})+$/i),
    OUTLOOK_INSTALL_URL: z
      .string()
      .url()
      .default('https://login.microsoftonline.com/organizations/adminconsent'),
    MICROSOFT_API_URL: z.string().url().default('https://graph.microsoft.com/v1.0'),
    MICROSOFT_AUTH_API_URL: z.string().url().default('https://login.microsoftonline.com'),
    ENCRYPTION_KEY: z.string().min(1),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    TOKEN_REFRESH_CRON: z.string().default('*/30 * * * *'),
    THIRD_PARTY_APPS_SYNC_CRON: z.string().min(1),
  },
  experimental__runtimeEnv: {},
});
