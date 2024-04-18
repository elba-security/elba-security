import { z } from 'zod';

const zEnvRetry = () =>
  z.coerce.number().int().min(0).max(20).optional().default(3) as unknown as z.ZodLiteral<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  >;

export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    DATABASE_HOST: z.string().min(1),
    DATABASE_PORT: z.coerce.number().int().positive(),
    DATABASE_USER: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_DATABASE: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().length(64),
    HARVEST_TOKEN_REFRESH_RETRIES: zEnvRetry().default(5),
    HARVEST_CLIENT_ID: z.string(),
    HARVEST_CLIENT_SECRET: z.string(),
    HARVEST_REDIRECT_URI: z.string().url(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_CRON: z.string(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(200),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
    HARVEST_USERS_BASE_URL: z.string().url(),
    HARVEST_AUTH_BASE_URL: z.string().url(),
  })
  .parse(process.env);
