import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    // Elba configuration
    ELBA_SOURCE_ID: z.string().uuid(),

    // Nango configuration
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),

    // Source configuration
    TYPEFORM_API_BASE_URL: z.string().url().default('https://api.typeform.com'),
    TYPEFORM_EU_API_BASE_URL: z.string().url().default('https://api.eu.typeform.com'),
    TYPEFORM_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    TYPEFORM_USERS_SYNC_BATCH_SIZE: zEnvInt().default(20),
    TYPEFORM_API_RATE_LIMIT: zEnvInt().default(2), // 2 requests per second
  })
  .parse(process.env);
