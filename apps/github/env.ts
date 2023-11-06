import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string(),
  },
  // @ts-expect-error -- why ?
  runtimeEnv: process.env,
});
