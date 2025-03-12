import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    MIRO_API_BASE_URL: z.string().url().default('https://api.miro.com'),
    MIRO_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    MIRO_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),
  })
  .parse(process.env);
