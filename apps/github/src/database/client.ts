import { env } from '@/common/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USERNAME,
  password: env.POSTGRES_PASSWORD,
  db: env.POSTGRES_DATABASE,
});

export const db = drizzle(client);
