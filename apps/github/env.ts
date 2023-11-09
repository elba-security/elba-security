import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const zEnvInt = () => z.string().transform(Number).pipe(z.number().int());

export const env = createEnv({
  client: {
    NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL: z.string().url(),
  },
  server: {
    CRON_SECRET: z.string(),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: zEnvInt(),
    POSTGRES_USERNAME: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DATABASE: z.string(),
    GITHUB_APP_ID: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    MAX_CONCURRENT_USERS_SYNC_JOBS: zEnvInt(),
    MAX_CONCURRENT_THIRD_PARTY_APPS_SYNC_JOBS: zEnvInt(),
    USERS_SYNC_FREQUENCY: zEnvInt(),
    USERS_SYNC_BATCH_SIZE: zEnvInt(),
    USERS_SYNC_MAX_RETRY: zEnvInt(),
    THIRD_PARTY_APPS_SYNC_FREQUENCY: zEnvInt(),
  },
  // @ts-expect-error process.env is not typed according to .env
  runtimeEnv: {
    ...process.env,
    // client env need to be specified explicitly
    NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL: process.env.NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL,
  },
});
