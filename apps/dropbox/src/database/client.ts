import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/common/env';

const connectionString = () => {
  if (['preview', 'production'].includes(env.VERCEL_ENV as string)) {
    return `${env.POSTGRES_URL}?sslmode=require`;
  }

  return env.POSTGRES_URL;
};

const queryClient = postgres(connectionString());

export const db = drizzle(queryClient);
