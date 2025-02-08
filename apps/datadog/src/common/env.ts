import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    DATADOG_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    DATADOG_USERS_SYNC_BATCH_SIZE: zEnvInt().default(200),
    DATADOG_USERS_SYNC_CONCURRENCY: zEnvInt().default(1),
    DATADOG_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);
