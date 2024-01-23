import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/env';

const getConnectionString = () => {
  if (['preview', 'production'].includes(env.VERCEL_ENV as string)) {
    return `${env.POSTGRES_URL}?sslmode=require`;
  }

  return env.POSTGRES_URL;
};

const queryClient = postgres(getConnectionString());

export const db = drizzle(queryClient);
