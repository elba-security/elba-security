import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  isServer: process.env.NODE_ENV === 'test' ? true : undefined, // For vitest
  server: {
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string().min(1),
    ELBA_REDIRECT_URL: z.string().min(1),
    ELBA_SOURCE_ID: z.string().min(1),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    ENCRYPTION_KEY: z.string().length(64),
    DATABASE_PROXY_PORT: z.coerce.number().int().positive().optional(),
    DATABASE_URL: z.string().min(1),
    SLACK_APP_LEVEL_TOKEN: z.string().min(1),
    SLACK_CLIENT_ID: z.string().min(1),
    SLACK_CLIENT_SECRET: z.string().min(1),
    SLACK_CONVERSATIONS_HISTORY_BATCH_SIZE: z.coerce.number().int().positive().default(200),
    SLACK_CONVERSATIONS_LIST_BATCH_SIZE: z.coerce.number().int().positive().default(200),
    SLACK_CONVERSATIONS_REPLIES_BATCH_SIZE: z.coerce.number().int().positive().default(1000),
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_USERS_LIST_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  },
  experimental__runtimeEnv: {},
});
