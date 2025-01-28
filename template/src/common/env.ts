import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    // Elba configuration
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),

    // Nango configuration
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),

    // Source configuration
    {{upper name}}_API_BASE_URL: z.string().url(),
    {{upper name}}_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    {{upper name}}_USERS_SYNC_BATCH_SIZE: zEnvInt().default(50),
  })
  .parse(process.env);
