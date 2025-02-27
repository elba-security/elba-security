import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    BITBUCKET_API_BASE_URL: z.string().url().default('https://api.bitbucket.org/2.0'),
    BITBUCKET_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    BITBUCKET_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    BITBUCKET_USERS_SYNC_BATCH_SIZE: zEnvInt().default(50),
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);
