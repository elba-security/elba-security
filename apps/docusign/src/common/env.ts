import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    DOCUSIGN_APP_INSTALL_URL: z.string().url().default('https://account.docusign.com'), // Development URL: https://account-d.docusign.com
    DOCUSIGN_CLIENT_ID: z.string().min(1),
    DOCUSIGN_CLIENT_SECRET: z.string().min(1),
    DOCUSIGN_REDIRECT_URI: z.string().url(),
    DOCUSIGN_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    DOCUSIGN_USERS_SYNC_BATCH_SIZE: zEnvInt().default(100),
    DOCUSIGN_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    DATABASE_URL: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
