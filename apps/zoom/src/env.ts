import { z } from 'zod';

export const env = z
  .object({
    ZOOM_APP_INSTALL_URL: z.string().url().default('https://zoom.us/oauth/'),
    ZOOM_API_BASE_URL: z.string().url().default('https://api.zoom.us/v2/'),
    ZOOM_CLIENT_ID: z.string().min(1),
    ZOOM_CLIENT_SECRET: z.string().min(1),
    ZOOM_REDIRECT_URI: z.string().url(),
    ZOOM_DELETE_USER_CONCURRENCY: z.coerce.number().int().positive().default(5),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    VERCEL_ENV: z.string().min(1).optional(),
    ZOOM_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    ZOOM_USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(2),
  })
  .parse(process.env);
