import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();
const zEnvRetry = () =>
  z.coerce.number().int().min(0).max(20).optional().default(3) as unknown as z.ZodLiteral<
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
    DOPPLER_API_BASE_URL: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive(),
    VERCEL_ENV: z.string().min(1).optional(),
    USERS_SYNC_CRON: z.string(),
    USERS_SYNC_RETRIES: zEnvRetry().default(5),
    USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
  })
  .parse(process.env);
