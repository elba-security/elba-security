import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    // Elba configuration
    ELBA_SOURCE_ID: z.string().uuid(),

    // Nango configuration
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),

    // TeamTailor configuration
    TEAMTAILOR_API_BASE_URL: z.string().url().default('https://api.teamtailor.com'),
    TEAMTAILOR_API_REGION: z.enum(['eu', 'us']).default('eu'),
    TEAMTAILOR_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    TEAMTAILOR_USERS_SYNC_BATCH_SIZE: zEnvInt().default(50),
  })
  .parse(process.env);
