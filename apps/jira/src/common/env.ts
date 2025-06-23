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
    JIRA_USERS_SYNC_CRON: z.string().default('0 0 * * *'),
    JIRA_USERS_SYNC_BATCH_SIZE: zEnvInt().default(200),
    JIRA_DELETE_USER_CONCURRENCY: zEnvInt().default(5),
  })
  .parse(process.env);
