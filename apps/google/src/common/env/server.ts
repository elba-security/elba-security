import { z } from 'zod';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
  isServer: process.env.NODE_ENV === 'test' ? true : undefined, // For vitest
  server: {
    DATA_PROTECTION_SYNC_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    DATA_PROTECTION_SYNC_CONCURRENCY: z.coerce.number().int().positive().min(1),
    DATA_PROTECTION_SYNC_CRON: z.string().min(1),
    DATA_PROTECTION_SYNC_PERSONAL_DRIVES_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    DATA_PROTECTION_SYNC_PERSONAL_DRIVES_CONCURRENCY: z.coerce.number().int().positive().min(1),
    DATA_PROTECTION_SYNC_SHARED_DRIVES_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    DATA_PROTECTION_SYNC_SHARED_DRIVES_CONCURRENCY: z.coerce.number().int().positive().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    DATABASE_URL: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    GOOGLE_AUTH_CLIENT_ID: z.string().min(1),
    GOOGLE_AUTH_CLIENT_SECRET: z.string().min(1),
    GOOGLE_AUTH_REDIRECT_URI: z.string().url(),
    GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: z.string().min(1),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1),
    THIRD_PARTY_APPS_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    THIRD_PARTY_APPS_CONCURRENCY: z.coerce.number().int().positive().min(1),
    THIRD_PARTY_APPS_SYNC_CRON: z.string().min(1),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().min(1),
    USERS_SYNC_CONCURRENCY: z.coerce.number().int().positive().min(1),
    USERS_SYNC_CRON: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {},
});
