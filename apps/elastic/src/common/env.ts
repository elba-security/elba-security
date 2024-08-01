import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    VERCEL_ENV: z.string().min(1).optional(),
    ENCRYPTION_KEY: z.string().length(64),
    ELASTIC_API_BASE_URL: z.string().url('https://api.elastic-cloud.com'),
    ELASTIC_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    ELASTIC_USERS_SYNC_BATCH_SIZE: zEnvInt().default(200),
    ELASTIC_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    ELASTIC_USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
  })
  .parse(process.env);
