import { z } from 'zod';

const zEnvInt = () => z.coerce.number().int().positive();

export const env = z
  .object({
    AZUREDEVOPS_API_BASE_URL: z.string().url().default('https://vssps.dev.azure.com'),
    AZUREDEVOPS_APP_INSTALL_URL: z.string().url().default('https://app.vssps.visualstudio.com'),
    AZUREDEVOPS_CLIENT_ID: z.string(),
    AZUREDEVOPS_CLIENT_SECRET: z.string(),
    AZUREDEVOPS_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
    AZUREDEVOPS_REDIRECT_URI: z.string().url(),
    AZUREDEVOPS_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    AZUREDEVOPS_USERS_SYNC_LIMIT: zEnvInt().default(400),
    DATABASE_PROXY_PORT: zEnvInt().optional(),
    DATABASE_URL: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().min(1),
    TOKEN_REFRESH_CRON: z.string().default('*/30 * * * *'),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
