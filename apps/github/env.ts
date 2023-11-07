import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL: z.string().url(),
  },
  server: {
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.string().transform(Number).pipe(z.number().int()),
    POSTGRES_USERNAME: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DATABASE: z.string(),
    GITHUB_APP_ID: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
  },
  // @ts-expect-error process.env is not typed according to .env
  runtimeEnv: {
    ...process.env,
    // client env need to be specified explicitly
    NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL: process.env.NEXT_PUBLIC_ELBA_GITHUB_INSTALL_URL,
  },
});
