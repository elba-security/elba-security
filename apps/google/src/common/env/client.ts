import { z } from 'zod';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_ID: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_ID: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_ID,
  },
});
