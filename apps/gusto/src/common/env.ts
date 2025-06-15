import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_SOURCE_ID: z.string().uuid(),
    GUSTO_API_BASE_URL: z.string().url().default('https://api.gusto-demo.com'),
    GUSTO_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    GUSTO_USERS_SYNC_BATCH_SIZE: zEnvInt().default(20),
    GUSTO_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
