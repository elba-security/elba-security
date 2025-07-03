import { z } from 'zod';
import { createEnv } from '@t3-oss/env-nextjs';

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
    ELBA_INNGEST_ENCRYPTION_KEY: z
      .string()
      .length(64)
      .regex(/^(?:[0-9a-f]{2})+$/i),
    ELBA_INNGEST_ENCRYPTION_KEY_IV: z
      .string()
      .length(32)
      .regex(/^(?:[0-9a-f]{2})+$/i)
      .default('7e8c2f9a1b0d6e3c5a4f8b1d9c0e7a3b'),
    EMAIL_SCANNING_GLOBAL_INNGEST_CONCURRENCY_LIMIT: z.coerce.number().positive().default(2500),
    MAX_EMAIL_BODY_LENGTH: z.coerce.number().positive().default(1000),
    GOOGLE_AUTH_CLIENT_ID: z.string().min(1),
    GOOGLE_AUTH_CLIENT_SECRET: z.string().min(1),
    GOOGLE_AUTH_REDIRECT_URI: z.string().url(),
    GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: z.string().min(1),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1),
    SYNCED_EMAILS_COUNT_PER_USER_LIMIT: z.coerce.number().positive().optional(),
    THIRD_PARTY_APPS_SYNC_CRON: z.string().min(1),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    USERS_SYNC_CONCURRENCY: z.coerce.number().int().positive().min(1),
    USERS_SYNC_CRON: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {},
});
