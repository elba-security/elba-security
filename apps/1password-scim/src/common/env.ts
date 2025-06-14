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
    // Note: 1Password SCIM requires the full SCIM Bridge URL
    ONEPASSWORD_SCIM_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    ONEPASSWORD_SCIM_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
  })
  .parse(process.env);
