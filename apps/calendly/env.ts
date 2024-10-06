import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    CALENDLY_APP_INSTALL_URL: z.string().url(),
    CALENDLY_API_BASE_URL: z.string().url(),
    CALENDLY_CLIENT_ID: z.string().min(1),
    CALENDLY_CLIENT_SECRET: z.string().min(1),
    CALENDLY_REDIRECT_URI: z.string().url(),
    CALENDLY_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    CALENDLY_USERS_SYNC_BATCH_SIZE: zEnvInt().default(20),
    CALENDLY_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
  })
  .parse(process.env);
