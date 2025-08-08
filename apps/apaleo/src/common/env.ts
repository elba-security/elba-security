import { z } from 'zod';

export const env = z
  .object({
    // Elba configuration
    ELBA_SOURCE_ID: z.string().uuid(),

    // Nango configuration
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),

    // Source configuration
    APALEO_API_BASE_URL: z.string().url(),
    APALEO_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
  })
  .parse(process.env);
