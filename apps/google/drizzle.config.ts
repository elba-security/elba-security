import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

const env = dotenv.config();
expand(env);

export default {
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL as never,
  },
  verbose: true,
  strict: true,
} satisfies Config;
