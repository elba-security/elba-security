import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/common/env';

const connectionString = () => {
  if (env.VERCEL_ENV === 'production') {
    return `${env.POSTGRES_URL}?sslmode=require`;
  }

  return env.POSTGRES_URL;
};

const queryClient = postgres(connectionString());

export const db = drizzle(queryClient);
