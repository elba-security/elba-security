import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();
const zEnvRetry = () =>
  z.coerce.number().int().min(0).max(20).optional().default(3) as unknown as z.ZodLiteral<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  >;

export const env = z
  .object({
    DROPBOX_CLIENT_ID: z.string(),
    DROPBOX_CLIENT_SECRET: z.string(),
    DROPBOX_CONCURRENT_DP_SYNC_JOBS: zEnvInt(),
    DROPBOX_DP_JOB_BATCH_SIZE: zEnvInt(),
    DROPBOX_REDIRECT_URI: z.string().url(),
    ENCRYPTION_KEY: z.string(),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().min(1),
    ELBA_API_KEY: z.string().min(1),
    ELBA_SOURCE_ID: z.string(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    VERCEL_ENV: z.string().optional(),
    ELBA_REGION: z.string(),
    DROPBOX_TOKEN_REFRESH_RETRIES: zEnvRetry().default(5),
    DROPBOX_USER_SYNC_RETRIES: zEnvRetry().default(5),
    DROPBOX_USER_SYNC_CONCURRENCY: zEnvInt().default(2),
    DROPBOX_TPA_DELETE_OBJECT_RETRIES: zEnvRetry().default(5),
    DROPBOX_TPA_DELETE_OBJECT_CONCURRENCY: zEnvInt().default(5),
    DROPBOX_TPA_REFRESH_OBJECT_RETRIES: zEnvRetry().default(5),
    DROPBOX_TPA_REFRESH_OBJECT_CONCURRENCY: zEnvInt().default(5),
    DROPBOX_TPA_SYNC_RETRIES: zEnvRetry().default(5),
    DROPBOX_TPA_SYNC_CONCURRENCY: zEnvInt().default(5),
    DROPBOX_REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry().default(5),
  })
  .parse(process.env);
