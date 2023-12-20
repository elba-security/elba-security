import type { Config } from 'drizzle-kit';
import { env } from './src/common/env';

export default {
  schema: './src/schemas/*.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString:
      env.VERCEL_ENV && env.VERCEL_ENV !== 'development'
        ? `${env.POSTGRES_URL}?sslmode=require`
        : env.POSTGRES_URL,
  },
} satisfies Config;
