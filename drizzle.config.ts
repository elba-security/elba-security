import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

const { error } = config({ path: '.env.local' });

if (error) {
  throw new Error(`Could not find environment variables file: .env.local`);
}

export default {
  schema: './src/database/schema*',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL as string,
  },
} satisfies Config;
