import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const zEnvRetry = () =>
  z.coerce.number().int().min(0).max(20).optional().default(3) as unknown as z.ZodLiteral<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  >;

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
    SLACK_SYNC_CONVERSATIONS_RETRY: zEnvRetry(),
    SLACK_SYNC_CONVERSATIONS_MESSAGES_CONCURRENCY: z.coerce.number().int().positive().default(10),
    SLACK_SYNC_CONVERSATIONS_MESSAGES_RETRY: zEnvRetry(),
    SLACK_SYNC_CONVERSATIONS_THREAD_MESSAGES_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive()
      .default(10),
    SLACK_SYNC_CONVERSATIONS_THREAD_MESSAGES_RETRY: zEnvRetry(),
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_USERS_LIST_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  },
  experimental__runtimeEnv: {},
});
