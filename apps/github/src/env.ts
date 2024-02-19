import { z } from 'zod';
import { envSchema } from '@elba-security/app-core/common';

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

export const env = envSchema
  .extend({
    DATABASE_URL: z.string().min(0),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    GITHUB_APP_INSTALL_URL: z.string().url(),
    GITHUB_APP_ID: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    MAX_CONCURRENT_USERS_SYNC: z.coerce.number().int().positive(),
    MAX_CONCURRENT_THIRD_PARTY_APPS_SYNC: z.coerce.number().int().positive(),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    THIRD_PARTY_APPS_SYNC_BATCH_SIZE: z.coerce.number().int().positive(),
    THIRD_PARTY_APPS_MAX_RETRY: zEnvRetry(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().optional(),
  })
  .parse(process.env);
