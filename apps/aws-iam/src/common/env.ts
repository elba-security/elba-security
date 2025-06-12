import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = createEnv({
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
  isServer: process.env.NODE_ENV === 'test' ? true : undefined, // For vitest
  server: {
    // Elba configuration
    ELBA_SOURCE_ID: z.string().uuid(),

    // Nango configuration
    NANGO_INTEGRATION_ID: z.string().min(1),
    NANGO_SECRET_KEY: z.string().min(1),

    // Source configuration
    AWS_IAM_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    AWS_IAM_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
  },
  experimental__runtimeEnv: {},
});
