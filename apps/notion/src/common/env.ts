import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    VERCEL_ENV: z.string().min(1).optional(),
    NOTION_API_BASE_URL: z.string().url().default('https://api.notion.com'),
    NOTION_CLIENT_ID: z.string().min(1),
    NOTION_CLIENT_SECRET: z.string().min(1),
    NOTION_REDIRECT_URI: z.string().url(),
    NOTION_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    NOTION_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    NOTION_USERS_SYNC_BATCH_SIZE: zEnvInt().default(2),
    NOTION_VERSION: z.string(),
  })
  .parse(process.env);
