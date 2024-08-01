import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();
const zEnvRetry = () =>
  z.coerce.number().int().min(0).max(20).optional().default(3) as unknown as z.ZodLiteral<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  >;

export const env = z
  .object({
    BOX_API_BASE_URL: z.string().url(),
    BOX_APP_INSTALL_URL: z.string().url(),
    BOX_CLIENT_ID: z.string().min(1),
    BOX_CLIENT_SECRET: z.string().min(1),
    BOX_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    BOX_REDIRECT_URI: z.string().url(),
    BOX_USERS_SYNC_BATCH_SIZE: zEnvInt().default(500),
    BOX_USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
    BOX_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    DATABASE_URL: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
