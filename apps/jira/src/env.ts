import { z } from 'zod';

const zEnvRetry = () =>
  z
    .unknown()
    .transform((value) => {
      if (typeof value === 'string') return Number(value);
      return value;
    })
    .pipe(z.number().int().min(0).max(20))
    .default(3) as unknown as z.ZodLiteral<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  >;

export const env = z
  .object({
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    JIRA_APP_ID: z.string().uuid(),
    JIRA_APP_INSTALL_URL: z.string().url(),
    JIRA_AUTH_URL: z.string().url(),
    JIRA_CALLBACK_URL: z.string().url(),
    JIRA_CLIENT_ID: z.string(),
    JIRA_CLIENT_SECRET: z.string(),
    JIRA_SCOPES: z.string(),
    JIRA_TOKEN_URL: z.string().url(),
    JIRA_API_BASE_URL: z.string().url(),
    POSTGRES_URL: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().positive(),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DATABASE: z.string().min(1),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
  })
  .parse(process.env);
